export interface PreviewBusiness {
  id: number;
  name: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  phone: string;
  location: string;
  servingArea: string;
  imageUrl: string;
  featured?: boolean;
  rank?: number;
}

export const previewBusinesses: PreviewBusiness[] = [
  {
    id: 1,
    name: "Pinnacle Home Services",
    categories: ["Home Services", "Roofing", "HVAC"],
    rating: 5.0,
    reviewCount: 142,
    phone: "(512) 555-1212",
    location: "Austin, TX",
    servingArea: "Greater Austin & Surrounding Areas",
    imageUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&q=80",
    featured: true,
  },
  {
    id: 2,
    name: "Capitol City Plumbing",
    categories: ["Plumbing"],
    rating: 4.9,
    reviewCount: 218,
    phone: "(512) 444-1000",
    location: "Austin, TX",
    servingArea: "Serving Greater Austin",
    imageUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80",
    rank: 1,
  },
  {
    id: 3,
    name: "Meridian Accounting & Tax",
    categories: ["Accounting"],
    rating: 4.8,
    reviewCount: 187,
    phone: "(512) 310-7890",
    location: "Austin, TX",
    servingArea: "Serving Greater Austin",
    imageUrl:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=400&fit=crop&q=80",
    rank: 2,
  },
  {
    id: 4,
    name: "Austin Premier Real Estate",
    categories: ["Real Estate", "Insurance"],
    rating: 4.7,
    reviewCount: 163,
    phone: "(512) 555-9876",
    location: "Austin, TX",
    servingArea: "Serving Greater Austin",
    imageUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80",
    rank: 3,
  },
];