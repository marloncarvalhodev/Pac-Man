"""Regressões matemáticas; referências independentes por Bellman-Ford."""
import math
import random
import unittest
from unittest.mock import patch

from src.graph import Graph, MazeGenerator, TerrainType as T, TERRAIN_COSTS, build_movement_graph
from src.pathfinding import a_star, dijkstra, solve_multi_goal, graph_manhattan_scale, manhattan_distance


def reference(graph, start, goal):
    """Bellman-Ford, sem compartilhar fila/relaxamento das buscas do projeto."""
    dist = {v: math.inf for v in graph.vertices}
    if start not in dist or goal not in dist:
        return math.inf
    dist[start] = 0
    for _ in range(graph.order - 1):
        old = dict(dist)
        for u in graph.vertices:
            for v, w in graph.neighbors(u):
                dist[v] = min(dist[v], old[u] + w)
        if old == dist:
            break
    return dist[goal]


def objective_reference(graph, start, keys, goal):
    """Bellman-Ford no produto (posição, conjunto de chaves coletadas)."""
    keys = list(dict.fromkeys(keys))
    masks = 1 << len(keys)
    bits = {k: 1 << i for i, k in enumerate(keys)}
    states = [(v, m) for v in graph.vertices for m in range(masks)]
    dist = {s: math.inf for s in states}
    dist[start, bits.get(start, 0)] = 0
    for _ in range(len(states) - 1):
        changed = False
        for (u, mask) in states:
            for v, w in graph.neighbors(u):
                dest = (v, mask | bits.get(v, 0))
                if dist[u, mask] + w < dist[dest]:
                    dist[dest] = dist[u, mask] + w
                    changed = True
        if not changed:
            break
    return dist[goal, masks - 1]


class GraphTests(unittest.TestCase):
    def test_empty(self):
        g = Graph()
        self.assertEqual((g.order, g.size, g.connection_count, g.bidirectional_count), (0, 0, 0, 0))
        self.assertEqual(list(g.neighbors((0, 0))), [])

    def test_isolated(self):
        g = Graph(); g.add_vertex((0, 0)); g.add_vertex((0, 0))
        self.assertEqual((g.order, g.size, g.degree((0, 0))), (1, 0, 0))

    def test_directed(self):
        g = Graph(); g.add_edge((0, 0), (0, 1), .3, False)
        self.assertEqual((g.size, g.connection_count, g.bidirectional_count), (1, 1, 0))
        self.assertEqual(list(g.neighbors((0, 0))), [((0, 1), .3)])
        self.assertFalse(g.has_edge((0, 1), (0, 0)))
        self.assertEqual(g.degree((0, 0)), 1)

    def test_opposite_asymmetric(self):
        g = Graph(); g.add_edge((0, 0), (0, 1), 4, False); g.add_edge((0, 1), (0, 0), .3, False)
        self.assertEqual((g.size, g.connection_count, g.bidirectional_count), (2, 1, 1))
        self.assertEqual(g.get_edge_weight((0, 0), (0, 1)), 4)
        self.assertEqual(g.get_edge_weight((0, 1), (0, 0)), .3)

    def test_mixed(self):
        g = Graph(); g.add_edge((0, 0), (0, 1)); g.add_edge((0, 1), (0, 2), 2, False)
        self.assertEqual((g.size, g.connection_count, g.bidirectional_count), (3, 2, 1))

    def test_loop_and_clear(self):
        g = Graph(); g.add_edge((0, 0), (0, 0), 0)
        self.assertEqual((g.size, g.connection_count, g.bidirectional_count), (1, 1, 0))
        g.clear(); self.assertEqual(g.order, 0)

    def test_invalid_weights(self):
        for w in (-1, math.inf, math.nan):
            with self.subTest(weight=w), self.assertRaises(ValueError):
                Graph().add_edge((0, 0), (0, 1), w)


class SearchTests(unittest.TestCase):
    def check_searches(self, graph, start, goal, expected=None):
        cost = reference(graph, start, goal) if expected is None else expected
        for search in (dijkstra, a_star):
            r = search(graph, start, goal)
            self.assertEqual(r.nodes_expanded, len(r.visited_order))
            if math.isinf(cost):
                self.assertFalse(r.found); self.assertEqual(r.path, [])
            else:
                self.assertTrue(r.found)
                self.assertAlmostEqual(r.cost, cost)
                self.assertEqual((r.path[0], r.path[-1]), (start, goal))
                self.assertAlmostEqual(sum(graph.get_edge_weight(u,v) for u,v in zip(r.path,r.path[1:])), cost)
                self.assertEqual(r.moves, len(r.path)-1)

    def test_simple(self):
        g = Graph(); g.add_edge((0, 0), (0, 1)); self.check_searches(g, (0, 0), (0, 1), 1)

    def test_weighted_alternatives(self):
        g = Graph()
        for u,v,w in [((0,0),(0,1),8),((0,0),(1,0),.3),((1,0),(1,1),.3),((1,1),(0,1),.3)]:
            g.add_edge(u,v,w,False)
        self.check_searches(g,(0,0),(0,1),.9)

    def test_unreachable(self):
        g = Graph(); g.add_vertex((0,0)); g.add_vertex((1,1)); self.check_searches(g,(0,0),(1,1))

    def test_start_is_goal(self):
        g = Graph(); g.add_vertex((0,0)); self.check_searches(g,(0,0),(0,0),0)

    def test_missing_vertices(self):
        self.check_searches(Graph(),(0,0),(0,0))

    def test_zero_cost(self):
        g = Graph(); g.add_edge((0,0),(10,10),0); self.check_searches(g,(0,0),(10,10),0)

    def test_multiple_optima(self):
        g = Graph(); g.add_edge((0,0),(0,1)); g.add_edge((0,0),(1,0)); g.add_edge((0,1),(1,1)); g.add_edge((1,0),(1,1))
        self.check_searches(g,(0,0),(1,1),2)

    def test_reopen_inconsistent_admissible(self):
        s,a,b,t = (0,0),(0,1),(1,0),(1,1)
        g = Graph()
        for u,v,w in ((s,a,3),(s,b,1),(b,a,1),(a,t,2),(b,t,8)):
            g.add_edge(u,v,w,False)
        h = {s:0,a:0,b:3,t:0}
        r = a_star(g,s,t,heuristic=lambda u,v:h[u])
        self.assertEqual(r.cost,4)
        self.assertEqual(r.visited_order.count(a),2)

    def test_random_directed_reference(self):
        for seed in range(30):
            rng = random.Random(seed); g = Graph(); nodes = [(i//3,i%3) for i in range(9)]
            for u in nodes:
                g.add_vertex(u)
                for v in nodes:
                    if rng.random()<.2: g.add_edge(u,v,rng.choice([0,.3,1,4,8]),False)
            for goal in nodes: self.check_searches(g,nodes[0],goal)

    def test_heuristic_consistent_multiple_shortcuts(self):
        g = Graph()
        for u,v,w in [((0,0),(50,0),.3),((50,0),(100,0),.3),((100,0),(100,1),4),((0,0),(100,1),8)]:
            g.add_edge(u,v,w,False)
        alpha = graph_manhattan_scale(g)
        for goal in g.vertices:
            for u in g.vertices:
                self.assertLessEqual(alpha*manhattan_distance(u,goal), reference(g,u,goal)+1e-9)
                for v,w in g.neighbors(u):
                    self.assertLessEqual(alpha*manhattan_distance(u,goal),w+alpha*manhattan_distance(v,goal)+1e-9)
            self.check_searches(g,(0,0),goal)


class PortalTests(unittest.TestCase):
    check_searches = SearchTests.check_searches
    # Fixture has two corridors: entering (0,1) lands at (2,1).
    def setUp(self):
        self.terrains = {p:T.NORMAL for p in [(0,0),(0,1),(0,2),(2,0),(2,1),(2,2)]}
        self.pairs = [((0,1),(2,1))]
        self.g = build_movement_graph(self.terrains,self.pairs)

    def test_both_directions(self):
        self.assertEqual(self.g.resolve_step((0,0),0,1),(2,1))
        self.assertEqual(self.g.resolve_step((2,0),0,1),(0,1))
        self.assertFalse(self.g.has_edge((0,0),(0,1)))

    def test_route_cost_and_visual(self):
        r = dijkstra(self.g,(0,0),(2,2))
        self.assertEqual(r.path,[(0,0),(2,1),(2,2)])
        self.assertEqual((r.cost,r.moves),(2,2))
        self.assertEqual(self.g.transition_points(r.path),[(0,0),(0,1),(2,1),(2,2)])

    def test_avoid_portal(self):
        self.check_searches(self.g,(0,1),(0,2),1)

    def test_exit_then_reenter(self):
        pos = self.g.resolve_step((0,0),0,1)
        self.assertEqual(pos,(2,1))
        pos = self.g.resolve_step(pos,0,1)
        self.assertEqual(pos,(2,2))
        self.assertEqual(self.g.resolve_step(pos,0,-1),(0,1))

    def test_invalid_commands(self):
        for dr,dc in [(0,0),(1,1),(2,0),(-1,0)]:
            self.assertIsNone(self.g.resolve_step((0,0),dr,dc))

    def test_invalid_pairs(self):
        for pairs in [[((0,1),(0,1))],[((0,1),(9,9))],self.pairs*2]:
            with self.assertRaises(ValueError): build_movement_graph(self.terrains,pairs)


class MultiGoalTests(unittest.TestCase):
    def setUp(self):
        self.g=Graph()
        self.s,self.a,self.b,self.t=(0,0),(0,1),(0,2),(0,3)
        # Greedy chooses a (1), but optimal order is b,a,t (2+1+1).
        for u,v,w in [(self.s,self.a,1),(self.s,self.b,2),(self.a,self.b,10),(self.b,self.a,1),(self.a,self.t,1),(self.b,self.t,10)]:
            self.g.add_edge(u,v,w,False)

    def check(self,keys):
        for algo in ('A*','Dijkstra'):
            with patch('src.pathfinding.dijkstra', wraps=dijkstra) as d, patch('src.pathfinding.a_star', wraps=a_star) as a:
                r=solve_multi_goal(self.g,self.s,keys,self.t,algo)
                self.assertEqual(d.call_count+a.call_count,len(r.search_results))
            self.assertEqual(r.cost,objective_reference(self.g,self.s,keys,self.t))
            self.assertEqual(r.path[-1],self.t)
            self.assertTrue(set(keys)<=set(r.path))
            self.assertEqual(r.visited_order,[v for seg in r.segments for v in seg.visited_order])
            self.assertEqual(r.nodes_expanded,sum(seg.nodes_expanded for seg in r.segments))
            self.assertEqual(r.total_nodes_expanded,sum(seg.nodes_expanded for seg in r.search_results))
            self.assertAlmostEqual(r.cost,sum(self.g.get_edge_weight(u,v) for u,v in zip(r.path,r.path[1:])))
        return r

    def test_no_keys(self): self.check([])
    def test_one_key(self): self.check([self.a])
    def test_two_keys(self):
        r=self.check([self.a,self.b]); self.assertEqual(r.key_order,[self.b,self.a]); self.assertEqual(r.cost,4)
    def test_duplicate_keys(self): self.check([self.a,self.a])
    def test_key_at_start(self): self.check([self.s,self.a])
    def test_unreachable_key(self):
        self.g.add_vertex((9,9)); r=solve_multi_goal(self.g,self.s,[(9,9)],self.t)
        self.assertFalse(r.found); self.assertFalse(r.visited_order); self.assertGreater(r.total_nodes_expanded,0)
    def test_unreachable_goal(self):
        self.g.add_vertex((9,9)); self.assertFalse(solve_multi_goal(self.g,self.s,[self.a],(9,9)).found)
    def test_random_product_reference(self):
        for seed in range(15):
            rng=random.Random(seed); g=Graph(); nodes=[(0,i) for i in range(6)]
            for u in nodes:
                g.add_vertex(u)
                for v in nodes:
                    if rng.random()<.4: g.add_edge(u,v,rng.choice([.3,1,4,8]),False)
            for algo in ('A*','Dijkstra'):
                r=solve_multi_goal(g,nodes[0],nodes[1:3],nodes[-1],algo)
                expected=objective_reference(g,nodes[0],nodes[1:3],nodes[-1])
                self.assertTrue(r.cost==expected or math.isclose(r.cost,expected))


class GenerationTests(unittest.TestCase):
    def test_reproducible_independent_rng(self):
        a=MazeGenerator(15,15,42); MazeGenerator(15,15,99).generate_world()
        w=a.generate_world(); other=MazeGenerator(15,15,42).generate_world()
        self.assertEqual(w.grid,other.grid); self.assertEqual(w.terrains,other.terrains); self.assertEqual(w.portal_pairs,other.portal_pairs)

    def test_dimensions(self):
        w=MazeGenerator(14,16,0).generate_world()
        self.assertEqual((len(w.grid),len(w.grid[0])),(15,17))
        with self.assertRaises(ValueError): MazeGenerator(1,1)

    def test_world_seeds_and_independent_movement(self):
        for size in (5,7,15,25):
            for seed in range(250):
                with self.subTest(size=size,seed=seed):
                    w=MazeGenerator(size,size,seed).generate_world(num_portal_pairs=seed%3)
                    cells={(r,c) for r,row in enumerate(w.grid) for c,value in enumerate(row) if value==0}
                    self.assertEqual(w.graph.vertices,cells)
                    endpoints=[p for pair in w.portal_pairs for p in pair]
                    self.assertEqual(len(endpoints),len(set(endpoints)))
                    items=[w.start,w.goal,*endpoints,*w.keys,*w.power_pellets,w.enemy_spawn,w.enemy_spawn2]
                    self.assertTrue(set(items)<=cells)
                    self.assertEqual(len(items),len(set(items)))
                    portal={a:b for a,b in w.portal_pairs for a,b in ((a,b),(b,a))}
                    # Oracle from grid/rules, independently of Graph's builder.
                    for u in cells:
                        expected={}
                        for dr,dc in [(1,0),(-1,0),(0,1),(0,-1)]:
                            entry=(u[0]+dr,u[1]+dc)
                            if entry in cells: expected[portal.get(entry,entry)]=TERRAIN_COSTS[w.terrains[entry]]
                        self.assertEqual(dict(w.graph.neighbors(u)),expected)
                    seen={w.start}; stack=[w.start]
                    while stack:
                        u=stack.pop()
                        for v,_ in w.graph.neighbors(u):
                            if v not in seen: seen.add(v); stack.append(v)
                    self.assertEqual(seen,cells)
                    # Conectividade forte: todos também alcançam o início.
                    reverse={v:[] for v in cells}
                    for u in cells:
                        for v,_ in w.graph.neighbors(u): reverse[v].append(u)
                    seen={w.start}; stack=[w.start]
                    while stack:
                        for v in reverse[stack.pop()]:
                            if v not in seen: seen.add(v); stack.append(v)
                    self.assertEqual(seen,cells)
                    self.assertEqual(w.graph.size,sum(w.graph.degree(v) for v in cells))
                    for goal in [w.goal,*w.keys]:
                        d=dijkstra(w.graph,w.start,goal); a=a_star(w.graph,w.start,goal)
                        self.assertTrue(d.found); self.assertAlmostEqual(d.cost,a.cost)
                    r=solve_multi_goal(w.graph,w.start,w.keys,w.goal)
                    self.assertTrue(r.found)
                    if size==5: self.assertAlmostEqual(r.cost,objective_reference(w.graph,w.start,w.keys,w.goal))

    def test_unweighted_generation(self):
        _,g,s,t=MazeGenerator(15,15,5).generate()
        self.assertEqual(g.size,2*g.connection_count)
        self.assertEqual(dijkstra(g,s,t).cost,reference(g,s,t))


if __name__=='__main__': unittest.main()
