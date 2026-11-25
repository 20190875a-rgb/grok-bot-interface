import { Table } from "@heroui/react";
import { EmptyState } from "@/components/empty-state";
import { accountTitle, formatBankroll, horizonLead } from "@/lib/prediction-matrix";
import type { Account, CityId, Horizon } from "@/lib/types";

export function AccountBankroll({ accounts }: { accounts: Account[] }) {
  if (!accounts.length) {
    return (
      <EmptyState
        detail="Add data/weather-sim/accounts.json with bankroll for the nine city × horizon accounts."
        title="No accounts"
      />
    );
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Account bankrolls" className="min-w-[640px]">
          <Table.Header>
            <Table.Column isRowHeader>Account</Table.Column>
            <Table.Column>Bankroll</Table.Column>
            <Table.Column>Start</Table.Column>
            <Table.Column>Won</Table.Column>
            <Table.Column>Lost</Table.Column>
          </Table.Header>
          <Table.Body>
            {accounts.map((account) => {
              const title =
                account.city && account.horizon
                  ? accountTitle(horizonLead(account.horizon as Horizon), account.city as CityId)
                  : null;
              return (
                <Table.Row key={account.account_id}>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <span className="font-medium">{title?.zh ?? account.name ?? account.account_id}</span>
                      <span className="text-xs text-muted">{title?.en ?? account.account_id}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="tabular-nums">{formatBankroll(account.bankroll)}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="tabular-nums text-muted">{formatBankroll(account.starting_bankroll)}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="tabular-nums">{account.bets_won ?? "—"}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="tabular-nums">{account.bets_lost ?? "—"}</span>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
