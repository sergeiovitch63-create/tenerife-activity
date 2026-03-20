export type ActivityMedia = {
  type: "video" | "image";
  src: string;
  poster?: string;
};

export type Activity = {
  id: string;
  title: string;
  slug: string;
  priceFrom: number;
  duration: string;
  location: string;
  description?: string;
  media: ActivityMedia;
  tags: string[];
  /**
   * Source-of-truth for recommendations diversity.
   * Optional because some legacy mappings don't provide vibeId.
   */
  vibeId?: string;
};





