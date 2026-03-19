

export interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  avatar: string;
}

export interface ProfileErrors {
  name?: string;
  phone?: string;
  city?: string;
}
