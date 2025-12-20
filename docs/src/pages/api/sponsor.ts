import type { APIContext } from 'astro';

/**
 * GitHub Sponsors API endpoint
 * Verifies if a user is a sponsor at the required tier
 */
export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Access token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // GraphQL query to check sponsorships
    const query = `
      query {
        user(login: "eliostruyf") {
          sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
            nodes {
              sponsorEntity {
                ... on User { login }
                ... on Organization { login }
              }
              tier {
                monthlyPriceInDollars
              }
            }
          }
        }
      }
    `;

    // Call GitHub GraphQL API
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sponsor data from GitHub' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Check for GraphQL errors
    if (data.errors) {
      return new Response(
        JSON.stringify({ error: 'GraphQL error', details: data.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the authenticated user's login to check if they're a sponsor
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user data' }),
        { status: userResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();
    const userLogin = userData.login;

    // Check if the user is among the sponsors with the minimum tier
    const MIN_TIER = 10; // Minimum €10 or $10 per month
    const sponsors = data.data?.user?.sponsorshipsAsMaintainer?.nodes || [];
    
    const isSponsor = sponsors.some((sponsorship: any) => {
      const sponsorLogin = sponsorship.sponsorEntity?.login;
      const monthlyPrice = sponsorship.tier?.monthlyPriceInDollars || 0;
      
      return sponsorLogin === userLogin && monthlyPrice >= MIN_TIER;
    });

    return new Response(
      JSON.stringify({ isSponsor }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sponsor check error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
