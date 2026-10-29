"""Integração Pygame com driver SDL dummy, sem janela ou áudio reais."""
import os
os.environ['SDL_VIDEODRIVER']='dummy'
os.environ['SDL_AUDIODRIVER']='dummy'
os.environ['PYGAME_HIDE_SUPPORT_PROMPT']='1'
import unittest
from unittest.mock import patch
import pygame
from src.main import MazeGame, EnemyAgent, COLOR_ENEMY_RED
from src.graph import build_movement_graph, TerrainType as T
from src.pathfinding import dijkstra


class GameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.game = MazeGame()

    @classmethod
    def tearDownClass(cls): pygame.quit()

    def setUp(self):
        self.g=self.game
        self.g.reset_maze(new_world=False)
        self.g.enemies=[]
        self.g.player_pos=(0,0); self.g.start_pos=(0,0); self.g.goal_pos=(0,3)
        self.g.terrains={p:T.NORMAL for p in [(0,0),(0,1),(0,2),(0,3),(2,0),(2,1),(2,2)]}
        self.g.portal_pairs=[((0,1),(2,1))]
        self.g.graph=build_movement_graph(self.g.terrains,self.g.portal_pairs)
        self.g.all_keys=[]; self.g.collected_keys=set(); self.g.power_pellets=set(); self.g.pac_dots=set()
        self.now=patch('pygame.time.get_ticks', return_value=10000); self.now.start()

    def tearDown(self): self.now.stop()

    def move(self,dr,dc):
        self.g.next_player_move_tick=0; self.g.move_player(dr,dc)

    def enemy(self,pos):
        e=EnemyAgent('test',COLOR_ENEMY_RED,pos,'DIRECT'); self.g.enemies=[e]; return e

    def test_player_portal_and_reentry(self):
        self.move(0,1); self.assertEqual(self.g.player_pos,(2,1))
        self.assertEqual(self.g.next_player_move_tick,10140)
        self.move(0,1); self.assertEqual(self.g.player_pos,(2,2))
        self.move(0,-1); self.assertEqual(self.g.player_pos,(0,1))

    def test_reverse_portal(self):
        self.g.player_pos=(2,0); self.move(0,1); self.assertEqual(self.g.player_pos,(0,1))

    def test_walls_and_invalid_moves(self):
        for dr,dc in [(-1,0),(1,0),(0,0),(1,1),(0,2)]:
            self.move(dr,dc); self.assertEqual(self.g.player_pos,(0,0))

    def test_cooldown(self):
        self.g.next_player_move_tick=10001; self.g.move_player(0,1); self.assertEqual(self.g.player_pos,(0,0))

    def test_collections_once(self):
        self.g.player_pos=(2,1); self.g.all_keys=[(2,2)]; self.g.pac_dots={(2,2)}; self.g.power_pellets={(2,2)}
        self.move(0,1); self.assertEqual(self.g.score,160); self.assertTrue(self.g.is_frightened)
        self.g.player_pos=(2,1); self.move(0,1); self.assertEqual(self.g.score,160)
        self.assertTrue(self.g.is_goal_unlocked)

    def test_exit_requires_keys(self):
        self.g.player_pos=(0,2); self.g.all_keys=[(2,2)]; self.move(0,1)
        self.assertFalse(self.g.game_won); self.assertFalse(self.g.is_goal_unlocked)
        self.g.player_pos=(0,2); self.g.collected_keys={(2,2)}; self.move(0,1)
        self.assertTrue(self.g.game_won); self.assertEqual(self.g.score,500)
        self.move(0,-1); self.assertEqual(self.g.score,500); self.assertEqual(self.g.player_pos,(0,3))

    def test_lava_death_precedes_victory(self):
        self.g.player_pos=(0,2); self.g.player_health=10
        self.g.terrains[(0,3)]=T.LAVA; self.g.graph=build_movement_graph(self.g.terrains,self.g.portal_pairs)
        self.move(0,1); self.assertTrue(self.g.game_over); self.assertFalse(self.g.game_won); self.assertEqual(self.g.score,0)
        self.move(0,-1); self.assertEqual(self.g.player_pos,(0,3))

    def test_collision_precedes_victory(self):
        self.g.player_pos=(0,2); self.enemy((0,3)); self.move(0,1)
        self.assertTrue(self.g.game_over); self.assertFalse(self.g.game_won); self.assertEqual(self.g.score,0)

    def test_weighted_movement(self):
        for terrain,delay,hp in [(T.MUD,560,100),(T.BOOST,42,100),(T.LAVA,1120,90)]:
            self.g.player_pos=(2,1); self.g.player_health=100; self.g.terrains[(2,2)]=terrain
            self.g.graph=build_movement_graph(self.g.terrains,self.g.portal_pairs)
            self.move(0,1)
            self.assertEqual(self.g.next_player_move_tick,10000+delay); self.assertEqual(self.g.player_health,hp)

    def test_enemy_uses_portal_exactly_once(self):
        e=self.enemy((0,0)); self.g.player_pos=(2,2)
        self.g.update_enemies(); self.assertEqual(e.pos,(2,1)); self.assertEqual(e.next_move_tick,10340)
        e.next_move_tick=0; self.g.player_pos=(2,0); self.g.update_enemies()
        self.assertEqual(e.pos,(2,0)); self.assertTrue(self.g.game_over)

    def test_enemy_weighted_cooldown(self):
        e=self.enemy((2,1)); self.g.player_pos=(2,2); self.g.terrains[(2,2)]=T.MUD
        self.g.graph=build_movement_graph(self.g.terrains,self.g.portal_pairs)
        self.g.update_enemies(); self.assertEqual(e.next_move_tick,11360)

    def test_ambush_personality_preserved(self):
        e=self.enemy((2,0)); e.behavior='AMBUSH'; self.g.player_pos=(0,0)
        with patch.object(self.g,'get_ambush_target',return_value=(2,2)) as target:
            self.g.update_enemies()
            target.assert_called_once()
            self.assertEqual(e.pos,(0,1))
            self.assertEqual(e.planned_path[-1],(2,2))

    def test_solver_route_is_executable_by_player(self):
        self.g.reset_maze(False); self.g.enemies=[]
        # Retira apenas dano para testar a execução de uma rota longa sem interferência.
        self.g.player_health=10000
        self.g.start_solving('A*'); result=self.g.last_result
        for u,v in zip(result.path,result.path[1:]):
            self.assertEqual(self.g.player_pos,u)
            entry=self.g.graph.transition_entry(u,v)
            self.move(entry[0]-u[0],entry[1]-u[1])
            self.assertEqual(self.g.player_pos,v)
        self.assertTrue(self.g.game_won)
        self.assertTrue(self.g.is_goal_unlocked)

    def test_capture_respawn_no_duplicate_score(self):
        e=self.enemy((2,2)); self.g.player_pos=e.pos; self.g.frightened_until_tick=17000
        self.g.check_enemy_collisions(); self.assertEqual(self.g.score,200); self.assertEqual(e.pos,e.spawn_pos)
        self.g.check_enemy_collisions(); self.g.update_enemies(); self.assertEqual(self.g.score,200)
        self.assertEqual(e.respawn_until_tick,11000)

    def test_frightened_local_flee(self):
        e=self.enemy((2,1)); self.g.player_pos=(2,0); self.g.frightened_until_tick=17000
        self.g.update_enemies(); self.assertEqual(e.pos,(2,2)); self.assertFalse(self.g.game_over)

    def test_frightened_expires(self):
        self.g.frightened_until_tick=9999; self.enemy((0,0)); self.g.check_enemy_collisions()
        self.assertTrue(self.g.game_over)

    def test_pause_and_terminal_states(self):
        e=self.enemy((2,0)); self.g.enemies_active=False; self.g.update_enemies(); self.assertEqual(e.pos,(2,0))
        self.g.enemies_active=True; self.g.game_won=True; self.g.update_enemies(); self.assertEqual(e.pos,(2,0))
        self.g.check_enemy_collisions(); self.g.start_solving('A*'); self.assertIsNone(self.g.last_result)

    def test_solver_animation_matches_portal_movement(self):
        self.g.goal_pos=(2,2); self.g.start_solving('A*')
        result=self.g.last_result
        while self.g.animating: self.g.update()
        self.assertEqual(self.g.solution_path_list,[(0,0),(0,1),(2,1),(2,2)])
        self.assertEqual(result.path,[(0,0),(2,1),(2,2)])
        self.g.clear_solution(); self.assertEqual(self.g.visited_set,set()); self.assertFalse(self.g.solution_path_list)

    def test_restart_restores_same_world(self):
        self.g.reset_maze(False); graph=self.g.graph; grid=self.g.grid
        self.g.score=999; self.g.player_health=0; self.g.game_over=True; self.g.enemies_active=False
        self.g.collected_keys=set(self.g.all_keys); self.g.power_pellets.clear(); self.g.start_solving('A*')
        self.g.reset_maze(False)
        self.assertIs(self.g.graph,graph); self.assertIs(self.g.grid,grid)
        self.assertEqual(self.g.score,0); self.assertEqual(self.g.player_health,100)
        self.assertFalse(self.g.game_over); self.assertFalse(self.g.game_won); self.assertTrue(self.g.enemies_active)
        self.assertFalse(self.g.collected_keys); self.assertEqual(self.g.power_pellets,set(self.g.initial_world.power_pellets))
        self.g.reset_maze(True); self.assertIsNot(self.g.graph,graph)

    def test_comparison_same_target_and_negative_reduction(self):
        self.g.goal_pos=(2,2); self.g.update_instant_comparison()
        self.assertEqual(self.g.comparison_dijkstra.cost,self.g.comparison_astar.cost)
        self.assertEqual(self.g.comparison_target,(2,2))
        d=dijkstra(self.g.graph,(0,0),(2,2)); a=dijkstra(self.g.graph,(0,0),(2,2))
        d.nodes_expanded=2; a.nodes_expanded=3
        with patch('src.main.dijkstra',return_value=d),patch('src.main.a_star',return_value=a):
            self.g.update_instant_comparison(); self.assertEqual(self.g.comp_gain_percent,-50)

    def test_keyboard_a_d_in_solver_mode(self):
        for key,expected in [(pygame.K_a,(0,-1)),(pygame.K_d,(0,1))]:
            events=[pygame.event.Event(pygame.KEYDOWN,key=key),pygame.event.Event(pygame.QUIT)]
            self.g.mode='SOLVER'
            with patch('pygame.event.get',return_value=events),patch.object(self.g,'move_player') as move,patch.object(self.g,'start_solving') as solve,patch('pygame.quit'):
                self.g.reset_maze(False); self.g.mode='SOLVER'; self.g.run()
                move.assert_called_once_with(*expected); solve.assert_not_called()

    def test_render_modes(self):
        self.g.reset_maze(False); self.g.enemies_active=False
        self.g.start_solving('A*')
        while self.g.animating: self.g.update()
        for xray in (False,True):
            self.g.show_graph_xray=xray
            self.g.draw_maze(); self.g.draw_hud(); self.g.draw_game_over_overlay()
        self.g.game_won=True; self.g.draw_game_over_overlay()
        self.g.game_won=False; self.g.game_over=True; self.g.draw_game_over_overlay()


if __name__=='__main__': unittest.main()
