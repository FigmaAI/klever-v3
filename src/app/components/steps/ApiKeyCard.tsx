import * as React from 'react';
import { Typography, Card, CardContent, Stack, Link, Box, Button } from '@mui/joy';
import { Key } from '@mui/icons-material';

interface ApiKeyCardProps {
  onSetApiKey: () => void;
}

export const ApiKeyCard = ({ onSetApiKey }: ApiKeyCardProps) => (
  <Card variant="outlined">
    <CardContent>
      <Typography level="h2" sx={{ mb: 2 }}>
        OpenAI API Key Required
      </Typography>
      <Typography level="body-md" sx={{ mb: 2 }}>
        To use Figma Client, you need an OpenAI API key with a minimum of $5 credit balance. Here's how to get started:
      </Typography>
      <Stack spacing={2}>
        <Typography level="body-sm">
          1. Visit the <Link href="https://platform.openai.com/signup" target="_blank">OpenAI Platform</Link>
        </Typography>
        <Typography level="body-sm">
          2. Create an account or sign in
        </Typography>
        <Typography level="body-sm">
          3. Go to <Link href="https://platform.openai.com/settings/organization/billing/overview" target="_blank">Billing settings</Link>
        </Typography>
        <Typography level="body-sm">
          4. Add a payment method and purchase at least $5 in credits
        </Typography>
        <Typography level="body-sm">
          5. Generate an API key from the <Link href="https://platform.openai.com/api-keys" target="_blank">API keys page</Link>
        </Typography>
      </Stack>
      <Box sx={{ mt: 3 }}>
        <Button
          variant="solid"
          color="primary"
          onClick={onSetApiKey}
          startDecorator={<Key />}
        >
          Set API Key
        </Button>
      </Box>
    </CardContent>
  </Card>
); 