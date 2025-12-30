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
  media: ActivityMedia;
  tags: string[];
};




