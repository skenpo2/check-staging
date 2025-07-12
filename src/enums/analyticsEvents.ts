export type SignupMethod = 'email' | 'google';
export type UserType = 'customer' | 'expert';
export type VerificationStatus =
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'rejected';
export type ReviewType = 'public' | 'private' | 'flagged';

export type EventName =
  | 'user_signup'
  | 'identification_verification_completed'
  | 'profile_completed'
  | 'profile_completeness_score'
  | 'service_listing_created'
  | 'search_performed'
  | 'service_viewed'
  | 'booking_initiated'
  | 'booking_accepted'
  | 'booking_completed'
  | 'payment_made'
  | 'review_submitted';

export interface EventProperties {
  user_signup: {
    user_id: string;
    signup_method: SignupMethod;
    user_type: UserType;
    timestamp: Date;
    location: string;
    referral_source: string;
    signup_device: string;
  };

  identification_verification_completed: {
    user_id: string;
    user_type: UserType;
    verification_method: string;
    timestamp: Date;
    id_type: string;
    verification_status: VerificationStatus;
  };

  profile_completed: {
    user_id: string;
    user_type: UserType;
    timestamp: Date;
  };

  profile_completeness_score: {
    user_id: string;
    user_type: UserType;
    timestamp: Date;
    profile_fields_filled: string[];
    completeness_score: number;
  };

  service_listing_created: {
    provider_id: string;
    service_id: string;
    timestamp: Date;
    service_category: string;
    price_range: string;
    location: string;
    service_description_length: number;
  };

  search_performed: {
    user_id: string;
    user_type: UserType;
    timestamp: Date;
    search_query: string;
    filters_applied: string;
    location: string;
    service_category: string;
    results_returned_count: number;
  };

  service_viewed: {
    user_id: string;
    user_type: UserType;
    service_id: string;
    provider_id: string;
    timestamp: Date;
    device_type: string;
  };

  booking_initiated: {
    booking_id: string;
    customer_id: string;
    provider_id: string;
    service_id: string;
    timestamp: Date;
    location: string;
    service_category: string;
    scheduled_date: Date;
  };

  booking_accepted: {
    booking_id: string;
    service_id: string;
    provider_id: string;
    customer_id: string;
    timestamp: Date;
    service_category: string;
    response_time: number;
    status: string;
  };

  booking_completed: {
    booking_id: string;
    service_id: string;
    customer_id: string;
    provider_id: string;
    timestamp: Date;
    service_category: string;
    duration_from_acceptance: number;
    location: string;
  };

  payment_made: {
    booking_id: string;
    user_id: string;
    service_id: string;
    amount: number;
    payment_method: string;
    timestamp: Date;
    transaction_id: string;
  };

  review_submitted: {
    review_id: string;
    customer_id: string;
    provider_id: string;
    booking_id: string;
    rating_score: number;
    review_text: string;
    review_date: Date;
    review_text_length: number;
    nps_proxy: number;
    review_type: ReviewType;
  };
}
