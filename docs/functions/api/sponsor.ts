import type { SponsorNode } from '../models/SponsorData';
import { GitHubService } from '../services/GitHubService';

// GitHub username to check sponsorships for
const MIN_SPONSOR_TIER = 10; // Minimum €10 or $10 per month

interface Env {
  GITHUB_AUTH?: string;
  PREDEFINED_SPONSORS?: string;
}

/**
 * GitHub Sponsors API endpoint
 * Verifies if a user is a sponsor at the required tier
 * POST /api/sponsor
 */
export async function onRequestPost(context: {
  request: Request;
  env: Env;
  params: Record<string, string>;
}): Promise<Response> {
  try {
    const { request, env } = context;
    const body = (await request.json()) as { token?: string };
    const { token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Access token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const username = await GitHubService.getUser(token);
    if (!username) {
      return new Response(JSON.stringify({ error: 'Invalid GitHub token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check predefined sponsors first
    const predefinedSponsors = env.PREDEFINED_SPONSORS
      ? env.PREDEFINED_SPONSORS.split(',').map((s) => s.trim().toLowerCase())
      : [];

    if (predefinedSponsors.includes(username.toLowerCase())) {
      return new Response(JSON.stringify({ isSponsor: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call GitHub GraphQL API
    const sponsorData = await GitHubService.getSponsors(env.GITHUB_AUTH!);

    // Check for GraphQL errors
    if (!sponsorData) {
      return new Response(JSON.stringify({ error: 'GraphQL error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isSponsor = sponsorData.some((sponsorship: SponsorNode) => {
      const sponsorLogin = sponsorship.sponsorEntity?.login;
      const monthlyPrice = sponsorship.tier?.monthlyPriceInDollars || 0;

      return sponsorLogin === username && monthlyPrice >= MIN_SPONSOR_TIER;
    });

    return new Response(JSON.stringify({ isSponsor }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sponsor check error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
