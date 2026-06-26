import { describe, it, expect } from 'vitest';
import { credentialStatusLabel } from './credential-status';

describe('credentialStatusLabel', () => {
  it('reports "Not connected" when no credential is stored', () => {
    expect(credentialStatusLabel(undefined).kind).toBe('none');
  });

  it('does NOT claim verified for a stored-but-untested key', () => {
    // A saved key (status active, never tested) must not read as "Connected" —
    // that overstated validity (e.g. an expired AWS key showed "Connected").
    const label = credentialStatusLabel({ status: 'active' });
    expect(label.kind).toBe('unverified');
    expect(label.text.toLowerCase()).toContain('unverified');
  });

  it('reports verified once a test has passed (lastTestedAt set)', () => {
    const label = credentialStatusLabel({ status: 'active', lastTestedAt: '2026-06-26T00:00:00Z' });
    expect(label.kind).toBe('verified');
  });

  it('reports invalid / expired status explicitly', () => {
    expect(credentialStatusLabel({ status: 'invalid' }).kind).toBe('invalid');
    expect(credentialStatusLabel({ status: 'expired' }).kind).toBe('expired');
  });
});
