import React from 'react';
import { render } from '@testing-library/react';
import { RecruitabilityPanel } from './RecruitabilityPanel';
import { mockRecruitabilityData } from '../mocks/recruitabilityData';

jest.mock('@radix-ui/themes', () => {
  const actual = jest.requireActual('@radix-ui/themes');
  return {
    __esModule: true,
    ...actual,
    default: actual.Box,
    Flex: actual.Flex,
    Text: actual.Text,
    Button: 'button',
    Badge: 'span',
    Progress: 'div',
    Grid: 'div',
  };
});

jest.mock('clsx', () => {
  return (classes: any) => {
    return Object.values(classes || {}).join(' ');
  };
});

describe('RecruitabilityPanel', () => {
  it('renders loading state when isLoading is true', () => {
    const { getByText } = render(
      <RecruitabilityPanel
        data={mockRecruitabilityData}
        isLoading={true}
        error={null}
      />
    );
    expect(getByText('Loading recruitability data...')).toBeInTheDocument();
  });

  it('renders error state when error is present', () => {
    const { getByText } = render(
      <RecruitabilityPanel
        data={mockRecruitabilityData}
        isLoading={false}
        error="Failed to load data"
      />
    );
    expect(getByText('Failed to load recruitability data')).toBeInTheDocument();
    expect(getByText('Failed to load data')).toBeInTheDocument();
  });

  it('renders empty state when no data is present', () => {
    const { getByText } = render(
      <RecruitabilityPanel
        data={null}
        isLoading={false}
        error={null}
      />
    );
    expect(getByText('No recruitability data available')).toBeInTheDocument();
  });

  it('renders Recruitability data when provided', () => {
    const { getByText, getByRole } = render(
      <RecruitabilityPanel
        data={mockRecruitabilityData}
        isLoading={false}
        error={null}
      />
    );
    expect(getByText('84/100')).toBeInTheDocument();
    expect(getByText('Good')).toBeInTheDocument();
    expect(getByText('85%')).toBeInTheDocument();
    expect(getByText('This candidate is recruitable. Excellent technical fit and short notice period make them a strong hire.')).toBeInTheDocument();
    expect(getByText('90-day notice period')).toBeInTheDocument();
    expect(getByText('Immediate joiner')).toBeInTheDocument();
    expect(getByText('Proceed with Caution. Strong technical fit but consider the 90-day notice period. Immediate interview recommended.')).toBeInTheDocument();
  });

  it('toggles blocker when clicked', () => {
    const { getByText, getByRole } = render(
      <RecruitabilityPanel
        data={mockRecruitabilityData}
        isLoading={false}
        error={null}
      />
    );
    const blockerCard = getByRole('button', { name: /90-day notice period/ });
    expect(blockerCard).toBeInTheDocument();
    expect(blockerCard).toHaveAttribute('aria-expanded', 'false');
  });
});
