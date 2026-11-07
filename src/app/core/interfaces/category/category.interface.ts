export interface Location {
  id: number;
  name: string;
}

export interface Incidence {
  id: number;
  name: string;
  location_id?: number;
}

export interface CategoriesResponse {
  success: boolean;
  message: string;
  data: {
    locations: Location[];
    incidences: Incidence[];
  };
}
