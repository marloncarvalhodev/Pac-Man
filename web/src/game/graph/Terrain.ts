/**
 * Tipos de Terrenos e Função de Ponderação w: E -> R+
 */

export enum TerrainType {
  NORMAL = 'NORMAL',
  BOOST = 'BOOST',
  MUD = 'MUD',
  LAVA = 'LAVA',
}

export const TERRAIN_COSTS: Record<TerrainType, number> = {
  [TerrainType.NORMAL]: 1.0,
  [TerrainType.BOOST]: 0.3,
  [TerrainType.MUD]: 4.0,
  [TerrainType.LAVA]: 8.0,
};

export interface TerrainMetadata {
  type: TerrainType;
  name: string;
  weight: number;
  description: string;
  colorHex: string;
  colorNum: number;
}

export const TERRAIN_METADATA: Record<TerrainType, TerrainMetadata> = {
  [TerrainType.NORMAL]: {
    type: TerrainType.NORMAL,
    name: 'Piso Normal',
    weight: 1.0,
    description: 'Atrito padrão (1.0x)',
    colorHex: '#1E293B',
    colorNum: 0x1e293b,
  },
  [TerrainType.BOOST]: {
    type: TerrainType.BOOST,
    name: 'Esteira',
    weight: 0.3,
    description: 'Aceleração rápida (0.3x)',
    colorHex: '#00C3D7',
    colorNum: 0x00c3d7,
  },
  [TerrainType.MUD]: {
    type: TerrainType.MUD,
    name: 'Lama / Pântano',
    weight: 4.0,
    description: 'Movimento lento (4.0x)',
    colorHex: '#785230',
    colorNum: 0x785230,
  },
  [TerrainType.LAVA]: {
    type: TerrainType.LAVA,
    name: 'Lava Ardente',
    weight: 8.0,
    description: 'Penalidade alta (-10 HP, 8.0x)',
    colorHex: '#DC3228',
    colorNum: 0xdc3228,
  },
};
