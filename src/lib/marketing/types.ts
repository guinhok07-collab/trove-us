export type MarketingSource = "footer" | "checkout";

export type MarketingStatus = "subscribed" | "unsubscribed";

export interface MarketingSubscriber {
  email: string;
  fullName?: string;
  status: MarketingStatus;
  source: MarketingSource;
  subscribedAt: string;
  unsubscribedAt?: string;
  updatedAt: string;
}
