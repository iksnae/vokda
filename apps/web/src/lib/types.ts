export type Voice = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  languages: string[];
  qualityTier: 'basic' | 'standard' | 'premium';
  variants: Array<{
    id: string;
    sourceType: 'cloud_provider' | 'hf_model' | 'hf_space' | 'hf_endpoint' | 'self_hosted';
    runnable: boolean;
    supportsSsml: boolean;
  }>;
};
