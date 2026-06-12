export interface SponsorData {
  data: Data;
}

export interface Data {
  viewer: Viewer;
  user: Sponsor;
}

export interface Sponsor {
  sponsorshipsAsMaintainer: SponsorshipsAsMaintainer;
}

export interface SponsorshipsAsMaintainer {
  nodes: SponsorNode[];
}

export interface SponsorNode {
  sponsorEntity: Viewer;
  tier: Tier;
}

export interface Tier {
  monthlyPriceInDollars: number;
}

export interface Viewer {
  login: string;
}
