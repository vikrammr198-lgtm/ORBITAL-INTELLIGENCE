export type SectionId = 'overview' | 'monitor' | 'explorer' | 'predictor' | 'analytics';

export interface ConjunctionEvent {
  event_id: number;
  mission_id: number;
  time_to_tca: number;
  risk: number;
  final_risk: number;
  high_risk: number;
  max_risk_estimate: number | null;
  max_risk_scaling: number | null;
  miss_distance: number | null;
  relative_speed: number | null;
  mahalanobis_distance: number | null;
  c_object_type: string;
  t_j2k_sma: number | null;
  t_j2k_ecc: number | null;
  t_j2k_inc: number | null;
  t_h_apo: number | null;
  t_h_per: number | null;
  c_j2k_sma: number | null;
  c_j2k_ecc: number | null;
  c_j2k_inc: number | null;
  c_h_apo: number | null;
  c_h_per: number | null;
  geocentric_latitude: number | null;
  azimuth: number | null;
  elevation: number | null;
  F10: number | null;
  AP: number | null;
}

export interface DatasetStats {
  raw_total_cdms: number;
  raw_unique_events: number;
  raw_high_risk_events: number;
  early_cutoff_days: number;
  early_total_cdms: number;
  early_unique_events: number;
  early_high_risk_events: number;
  early_low_risk_events: number;
  early_high_risk_pct: number;
  unique_missions: number;
  mean_time_to_tca_days: number;
  median_miss_distance_m: number;
  object_type_distribution: Array<{
    type: string;
    total: number;
    high_risk: number;
  }>;
  final_risk_histogram: Array<{
    bin: string;
    min: number;
    max: number;
    count: number;
    is_high_risk: boolean;
  }>;
  missions: Array<{
    mission_id: number;
    total_events: number;
    high_risk_events: number;
    avg_miss_km: number;
  }>;
}

export interface OverviewResponse {
  stats: DatasetStats;
  model_info: {
    model_name: string;
    threshold: number;
    raw_feature_count: number;
    transformed_feature_count: number;
    cutoff_days: number;
    status: string;
  };
  recent_events: ConjunctionEvent[];
}

export interface EventsListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: ConjunctionEvent[];
}

export interface TimelinePoint {
  time_to_tca: number;
  risk: number;
  max_risk_estimate: number;
  miss_distance: number;
  relative_speed: number;
  mahalanobis_distance: number;
}

export interface EventDetailResponse {
  summary: ConjunctionEvent;
  features: Record<string, number | string | null>;
  rtn_vectors: {
    relative_position_r: number | null;
    relative_position_t: number | null;
    relative_position_n: number | null;
    relative_velocity_r: number | null;
    relative_velocity_t: number | null;
    relative_velocity_n: number | null;
  };
  timeline: TimelinePoint[];
}

export interface FeatureFieldSchema {
  name: string;
  type: 'number' | 'category';
  median?: number;
  min?: number;
  max?: number;
  p05?: number;
  p95?: number;
  categories?: string[];
  default?: string;
  missing_pct: number;
}

export interface FeaturePreset {
  event_id: number;
  actual_high_risk: number;
  final_risk: number;
  mission_id: number;
  c_object_type: string;
  miss_distance: number;
  time_to_tca: number;
  features: Record<string, number | string | null>;
}

export interface FeatureSchemaResponse {
  feature_columns: string[];
  threshold: number;
  model: string;
  schema: FeatureFieldSchema[];
  presets: FeaturePreset[];
}

export interface PredictionResponse {
  predicted_class: number;
  classification: 'HIGH RISK' | 'LOW RISK';
  high_risk_probability: number;
  threshold: number;
  model: string;
}

export interface AnalyticsResponse {
  feature_importance: Array<{ feature: string; importance: number }>;
  model_leaderboard: Array<{
    model: string;
    threshold: number;
    precision: number;
    recall: number;
    f2_score: number;
    selected: boolean;
  }>;
  final_test_evaluation: {
    model: string;
    threshold: number;
    test_samples: number;
    high_risk_support: number;
    low_risk_support: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    f2_score: number;
    pr_auc: number;
    roc_auc: number;
    confusion_matrix: {
      tn: number;
      fp: number;
      fn: number;
      tp: number;
    };
  };
  dataset_stats: DatasetStats;
}

export interface OrbitalSceneItem extends ConjunctionEvent {
  relative_position_r: number | null;
  relative_position_t: number | null;
  relative_position_n: number | null;
  relative_velocity_r: number | null;
  relative_velocity_t: number | null;
  relative_velocity_n: number | null;
  simulated_raan_deg: number;
  simulated_phase_deg: number;
}

export interface OrbitalScenesResponse {
  visualization_note: string;
  scenes: OrbitalSceneItem[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model: string;
  threshold: number;
  feature_count: number;
  events_loaded: number;
}
