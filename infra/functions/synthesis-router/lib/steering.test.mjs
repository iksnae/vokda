import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVoiceSteering } from './steering.mjs';

test('OpenAI → instructions', () => {
  const s = getVoiceSteering({ providerId: 'openai' });
  assert.equal(s.kind, 'instructions');
  assert.equal(s.param, 'instructions');
});

test('ElevenLabs → settings with the voice_settings keys', () => {
  const s = getVoiceSteering({ providerId: 'elevenlabs' });
  assert.equal(s.kind, 'settings');
  assert.ok(s.settings.some((x) => x.key === 'stability'));
  assert.equal(s.audioTagsModel, 'eleven_v3');
});

test('Polly newscaster only for the 4 supported voices', () => {
  assert.equal(getVoiceSteering({ providerId: 'aws-polly', providerVoiceId: 'Matthew' }).kind, 'styles');
  assert.equal(getVoiceSteering({ providerId: 'aws-polly', providerVoiceId: 'Kendra' }).kind, 'none');
});

test('unknown provider → none', () => {
  assert.equal(getVoiceSteering({ providerId: 'cartesia' }).kind, 'none');
});
