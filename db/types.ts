export interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  location: string;
  price_msat: number;
  image: string;
  total_tickets: number;
  max_tickets_per_person: number;
}
