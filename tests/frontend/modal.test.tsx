import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import JobDetailModal from '../../src/components/JobDetailModal';
import type { Job } from '../../shared/types';

const mockJob: Job = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Senior Engineer',
  company: 'TestCo',
  location: 'Toronto',
  country: 'Canada',
  description: 'Build stuff',
  summary: 'A great role',
  apply_url: 'https://testco.com/apply',
  company_url: 'https://testco.com',
  company_logo_url: null,
  source_type: 'direct',
  source_name: 'community',
  status: 'active',
  posted_date: '2026-03-10T12:00:00Z',
  created_at: '2026-03-10T12:00:00Z',
  updated_at: '2026-03-10T12:00:00Z',
  submission_ref: 'CJ-TEST1234',
  submitter_email: null,
  tags: ['fintech', 'remote'],
  standout_perks: [],
  expires_at: null,
};

describe('JobDetailModal', () => {
  it('renders nothing when job is null', () => {
    const { container } = render(<JobDetailModal job={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders job details when job is provided', () => {
    render(<JobDetailModal job={mockJob} onClose={() => {}} />);
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('TestCo')).toBeInTheDocument();
    expect(screen.getByText('A great role')).toBeInTheDocument();
    expect(screen.getByText('Apply Now')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<JobDetailModal job={mockJob} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<JobDetailModal job={mockJob} onClose={onClose} />);
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows community trust cues', () => {
    render(<JobDetailModal job={mockJob} onClose={() => {}} />);
    expect(screen.getByText('Community verified')).toBeInTheDocument();
    expect(screen.getByText('Warm intro possible')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<JobDetailModal job={mockJob} onClose={() => {}} />);
    expect(screen.getByText('fintech')).toBeInTheDocument();
    expect(screen.getByText('remote')).toBeInTheDocument();
  });

  it('shows standout perks when present', () => {
    const jobWithPerks = {
      ...mockJob,
      standout_perks: ['4-day work week', 'Remote-first', '$5K learning budget'],
    };
    render(<JobDetailModal job={jobWithPerks} onClose={() => {}} />);
    expect(screen.getByText('What Stands Out')).toBeInTheDocument();
    expect(screen.getByText('4-day work week')).toBeInTheDocument();
    expect(screen.getByText('Remote-first')).toBeInTheDocument();
    expect(screen.getByText('$5K learning budget')).toBeInTheDocument();
  });

  it('hides standout perks section when empty', () => {
    render(<JobDetailModal job={mockJob} onClose={() => {}} />);
    expect(screen.queryByText('What Stands Out')).not.toBeInTheDocument();
  });
});
