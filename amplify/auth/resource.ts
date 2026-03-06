import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true
  },
  groups: ['guest', 'curator', 'admin']
});

// Note: Password policy relaxed via AWS CLI (Amplify Gen2 doesn't expose this):
// aws cognito-idp update-user-pool --user-pool-id us-east-1_9hZ6azqx6 \
//   --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":false,"RequireNumbers":false,"RequireSymbols":false}}'
