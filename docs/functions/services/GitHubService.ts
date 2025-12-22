import type { SponsorData, SponsorNode } from '../models/SponsorData';

const headers = {
  'Content-Type': 'application/json',
  'User-Agent': 'demo-time',
  Host: 'api.github.com',
};

const MAINTAINER_USERNAME = 'estruyf';

export class GitHubService {
  public static async getUser(token: string) {
    const response = await fetch(`https://api.github.com/user`, {
      method: 'GET',
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const data: { login: string } = await response.json();

    return data.login;
  }

  public static async getSponsors(token: string) {
    const response = await fetch(`https://api.github.com/graphql`, {
      method: 'POST',
      headers: {
        ...headers,
        Authorization: `token ${token}`,
      },
      body: JSON.stringify({
        query: `
      query {
        viewer {
          login
        }
        user(login: "${MAINTAINER_USERNAME}") {
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
      }`,
      }),
    });

    let sponsors: SponsorNode[] = [];

    if (response && response.ok) {
      const data = (await response.json()) as SponsorData;
      sponsors = data.data?.user?.sponsorshipsAsMaintainer?.nodes || [];
    } else {
      return null;
    }

    if (sponsors && sponsors.length > 0) {
      return sponsors;
    }

    return [];
  }
}
