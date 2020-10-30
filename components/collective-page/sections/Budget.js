import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@apollo/client';
import { isEmpty } from 'lodash';
import { FormattedMessage, injectIntl } from 'react-intl';

import hasFeature, { FEATURES } from '../../../lib/allowed-features';
import { CollectiveType } from '../../../lib/constants/collectives';
import { formatCurrency } from '../../../lib/currency-utils';
import { getEnvVar } from '../../../lib/env-utils';
import { GraphQLContext } from '../../../lib/graphql/context';
import { API_V2_CONTEXT, gqlV2 } from '../../../lib/graphql/helpers';
import { parseToBoolean } from '../../../lib/utils';

import Container from '../../Container';
import DefinedTerm, { Terms } from '../../DefinedTerm';
import { Box, Flex } from '../../Grid';
import Link from '../../Link';
import MessageBox from '../../MessageBox';
import StyledButton from '../../StyledButton';
import StyledCard from '../../StyledCard';
import { H3, P, Span } from '../../Text';
import { transactionsQueryCollectionFragment } from '../../transactions/graphql/fragments';
import TransactionsList from '../../transactions/TransactionsList';
import { withUser } from '../../UserProvider';
import ContainerSectionContent from '../ContainerSectionContent';
import SectionTitle from '../SectionTitle';

import SectionGoals from './Goals';

export const budgetSectionQuery = gqlV2/* GraphQL */ `
  query BudgetSection($slug: String!, $limit: Int!) {
    transactions(account: { slug: $slug }, limit: $limit) {
      ...TransactionsQueryCollectionFragment
    }
  }
  ${transactionsQueryCollectionFragment}
`;

export const getBudgetSectionQueryVariables = slug => {
  return { slug, limit: 3 };
};

/**
 * The budget section. Shows the expenses, the latests transactions and some statistics
 * abut the global budget of the collective.
 */
const SectionBudget = ({ collective, stats, LoggedInUser }) => {
  const budgetQueryResult = useQuery(budgetSectionQuery, {
    variables: getBudgetSectionQueryVariables(collective.slug),
    context: API_V2_CONTEXT,
  });
  const { data, refetch } = budgetQueryResult;
  const monthlyRecurring =
    (stats.activeRecurringContributions?.monthly || 0) + (stats.activeRecurringContributions?.yearly || 0) / 12;
  const isFund = collective.type === CollectiveType.FUND;
  const isProject = collective.type === CollectiveType.PROJECT;
  React.useEffect(() => {
    refetch();
  }, [LoggedInUser]);

  return (
    <ContainerSectionContent pt={[4, 5]} pb={3}>
      <SectionTitle>
        <FormattedMessage id="section.budget.title" defaultMessage="Budget" />
      </SectionTitle>
      <P color="black.600" mb={4} maxWidth={830}>
        <FormattedMessage
          id="CollectivePage.SectionBudget.Description"
          defaultMessage="See how money openly circulates through {collectiveName}. All contributions and all expenses are published in our transparent public ledger. Learn who is donating, how much, where is that money going, submit expenses, get reimbursed and more!"
          values={{ collectiveName: collective.name }}
        />
      </P>
      <Flex flexDirection={['column-reverse', null, 'row']} justifyContent="space-between" alignItems="flex-start">
        {isEmpty(data?.transactions) && (
          <MessageBox type="info" withIcon maxWidth={800} fontStyle="italic" fontSize="14px">
            <FormattedMessage
              id="SectionBudget.Empty"
              defaultMessage="No transaction or expense created yet. They'll start appearing here as soon as you get your first
                  financial contributors or when someone creates an expense."
            />
          </MessageBox>
        )}

        <Container flex="10" mb={3} width="100%" maxWidth={800}>
          <GraphQLContext.Provider value={budgetQueryResult}>
            <TransactionsList
              collective={collective}
              transactions={data?.transactions?.nodes}
              displayActions
              onMutationSuccess={() => refetch()}
            />
          </GraphQLContext.Provider>
          <Flex flexWrap="wrap" justifyContent="space-between" mt={3}>
            <Box flex="1 1" mx={[0, 2]}>
              <Link route="transactions" params={{ collectiveSlug: collective.slug }}>
                <StyledButton
                  data-cy="view-all-transactions-btn"
                  my={2}
                  minWidth={290}
                  width="100%"
                  buttonSize="small"
                  fontSize="14px"
                >
                  <FormattedMessage id="CollectivePage.SectionBudget.ViewAll" defaultMessage="View all transactions" />
                </StyledButton>
              </Link>
            </Box>
            <Box flex="1 1" mx={[0, 2]}>
              <Link route="expenses" params={{ collectiveSlug: collective.slug }}>
                <StyledButton
                  data-cy="view-all-expenses-btn"
                  my={2}
                  minWidth={290}
                  width="100%"
                  buttonSize="small"
                  fontSize="14px"
                >
                  <FormattedMessage
                    id="CollectivePage.SectionBudget.ViewAllExpenses"
                    defaultMessage="View all expenses"
                  />
                </StyledButton>
              </Link>
            </Box>
          </Flex>
        </Container>

        <Box width="32px" flex="1" />

        <StyledCard
          display="flex"
          flex={[null, null, '1 1 300px']}
          width="100%"
          flexDirection={['column', 'row', 'column']}
          mb={2}
          mx={[null, null, 3]}
        >
          <Box data-cy="budgetSection-today-balance" flex="1" py={16} px={4}>
            <P fontSize="10px" textTransform="uppercase" color="black.700">
              <FormattedMessage id="CollectivePage.SectionBudget.Balance" defaultMessage="Today’s balance" />
            </P>
            <P fontSize="20px" mt={1}>
              {formatCurrency(stats.balance, collective.currency)} <Span color="black.400">{collective.currency}</Span>
            </P>
          </Box>
          {!isFund && !isProject && (
            <Container data-cy="budgetSection-estimated-budget" flex="1" background="#F5F7FA" py={16} px={4}>
              <DefinedTerm
                term={Terms.ESTIMATED_BUDGET}
                fontSize="10px"
                textTransform="uppercase"
                color="black.700"
                extraTooltipContent={
                  <Box mt={2}>
                    <FormattedMessage
                      id="CollectivePage.SectionBudget.MonthlyRecurringAmount"
                      defaultMessage="Monthly recurring: {amount}"
                      values={{ amount: formatCurrency(monthlyRecurring, collective.currency) }}
                    />
                    <br />
                    <FormattedMessage
                      id="CollectivePage.SectionBudget.TotalAmountReceived"
                      defaultMessage="Total received in the last 12 months: {amount}"
                      values={{ amount: formatCurrency(stats?.totalAmountReceived || 0, collective.currency) }}
                    />
                  </Box>
                }
              />
              <P fontSize="20px" mt={2}>
                <Span fontWeight="bold">~ {formatCurrency(stats.yearlyBudget, collective.currency)}</Span>{' '}
                <Span color="black.400">{collective.currency}</Span>
              </P>
            </Container>
          )}
        </StyledCard>
      </Flex>
      {hasFeature(collective, FEATURES.COLLECTIVE_GOALS) && parseToBoolean(getEnvVar('NEW_COLLECTIVE_NAVBAR')) && (
        <React.Fragment>
          <Flex mb={3} justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <H3 fontSize="20px" fontWeight="600" color="black.700">
              <FormattedMessage
                id="Collective.Goals"
                defaultMessage="{collective}'s Goals"
                values={{
                  collective: collective.name,
                }}
              />
            </H3>
          </Flex>
          <SectionGoals collective={collective} />
        </React.Fragment>
      )}
    </ContainerSectionContent>
  );
};

SectionBudget.propTypes = {
  /** Collective */
  collective: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    isArchived: PropTypes.bool,
    settings: PropTypes.object,
  }),

  /** Stats */
  stats: PropTypes.shape({
    balance: PropTypes.number.isRequired,
    yearlyBudget: PropTypes.number.isRequired,
    activeRecurringContributions: PropTypes.object,
    totalAmountReceived: PropTypes.number,
  }),

  LoggedInUser: PropTypes.object,

  /** @ignore from injectIntl */
  intl: PropTypes.object,
};

export default React.memo(withUser(injectIntl(SectionBudget)));
