interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Boardgames MCP — wraps Board Game Atlas API (public demo client_id, free)
 *
 * Tools:
 * - search_games: Search board games by name
 * - get_game: Get full details for a specific board game by ID
 * - hot_games: Get the most popular board games right now
 */


const BASE_URL = 'https://api.boardgameatlas.com/api';
const CLIENT_ID = 'JLBr5npPhV';

// ── API types ─────────────────────────────────────────────────────────

type RawGame = {
  id: string;
  name: string;
  year_published: number | null;
  min_players: number | null;
  max_players: number | null;
  min_playtime: number | null;
  max_playtime: number | null;
  min_age: number | null;
  description_preview: string | null;
  thumb_url: string | null;
  image_url: string | null;
  url: string | null;
  price: string | null;
  msrp: number | null;
  discount: string | null;
  primary_publisher: { id: string; name: string } | null;
  primary_designer: { id: string; name: string } | null;
  average_user_rating: number | null;
  num_user_ratings: number | null;
  rank: number | null;
  trending_rank: number | null;
  mechanics: Array<{ id: string }> | null;
  categories: Array<{ id: string }> | null;
};

type BoardGameAtlasResponse = {
  games: RawGame[];
  count: number;
};

// ── Tool definitions ──────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'search_games',
    description:
      'Search for board games by name using Board Game Atlas. Returns name, year, player count, playtime, rating, price, and a short description.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Board game name or partial name to search for, e.g. "Catan" or "Ticket to Ride"',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (1–100, default 10)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_game',
    description:
      'Get full details for a specific board game by its Board Game Atlas ID. Returns name, year, player count, playtime, description, rating, publisher, designer, and price.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Board Game Atlas game ID (e.g. "OIXt3DmJU0" for Catan)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'hot_games',
    description:
      'Get the most popular board games right now, ordered by popularity rank. Returns name, year, player count, playtime, rating, and rank.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of results to return (1–100, default 10)',
        },
      },
      required: [],
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────

function formatGame(g: RawGame) {
  return {
    id: g.id,
    name: g.name,
    year_published: g.year_published ?? null,
    min_players: g.min_players ?? null,
    max_players: g.max_players ?? null,
    min_playtime: g.min_playtime ?? null,
    max_playtime: g.max_playtime ?? null,
    min_age: g.min_age ?? null,
    description: g.description_preview ?? null,
    image_url: g.image_url ?? null,
    thumb_url: g.thumb_url ?? null,
    url: g.url ?? null,
    price: g.price ?? null,
    msrp: g.msrp ?? null,
    average_user_rating: g.average_user_rating ?? null,
    num_user_ratings: g.num_user_ratings ?? null,
    rank: g.rank ?? null,
    trending_rank: g.trending_rank ?? null,
    primary_publisher: g.primary_publisher?.name ?? null,
    primary_designer: g.primary_designer?.name ?? null,
  };
}

// ── Tool implementations ──────────────────────────────────────────────

async function searchGames(name: string, limit = 10) {
  const params = new URLSearchParams({
    name,
    client_id: CLIENT_ID,
    limit: String(Math.min(Math.max(limit, 1), 100)),
    order_by: 'rank',
    ascending: 'false',
  });

  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) throw new Error(`Board Game Atlas API error: ${res.status}`);

  const data = (await res.json()) as BoardGameAtlasResponse;

  return {
    count: data.count,
    games: data.games.map(formatGame),
  };
}

async function getGame(id: string) {
  const params = new URLSearchParams({
    ids: id,
    client_id: CLIENT_ID,
  });

  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) throw new Error(`Board Game Atlas API error: ${res.status}`);

  const data = (await res.json()) as BoardGameAtlasResponse;
  if (!data.games || data.games.length === 0) throw new Error(`Board game not found: ${id}`);

  return formatGame(data.games[0]!);
}

async function hotGames(limit = 10) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    limit: String(Math.min(Math.max(limit, 1), 100)),
    order_by: 'popularity',
    ascending: 'false',
  });

  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) throw new Error(`Board Game Atlas API error: ${res.status}`);

  const data = (await res.json()) as BoardGameAtlasResponse;

  return {
    count: data.count,
    games: data.games.map(formatGame),
  };
}

// ── Dispatcher ────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_games':
      return searchGames(args.name as string, args.limit as number | undefined);
    case 'get_game':
      return getGame(args.id as string);
    case 'hot_games':
      return hotGames(args.limit as number | undefined);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
