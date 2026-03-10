import { getApplicationAddress } from 'algosdk'
import { TransactionReview } from '@d13co/algo-x-evm-ui'
import type { TransactionData, TransactionDanger, AssetLookupClient } from '@d13co/algo-x-evm-ui'

interface TransactionViewProps {
  transactions: TransactionData[]
  message: string
  dangerous: TransactionDanger
  origin: string
  walletName?: string
  signing: boolean
  algodClient?: AssetLookupClient
  payloadVerified?: boolean | null
  onApprove: () => void
  onReject: () => void
}

export function TransactionView({
  transactions,
  message,
  dangerous,
  origin,
  walletName,
  signing,
  algodClient,
  payloadVerified,
  onApprove,
  onReject,
}: TransactionViewProps) {
  return (
    <TransactionReview
      transactions={transactions}
      message={message}
      dangerous={dangerous}
      algodClient={algodClient}
      getApplicationAddress={(appId: number) => getApplicationAddress(BigInt(appId))}
      onApprove={onApprove}
      onReject={onReject}
      signing={signing}
      walletName={walletName}
      origin={origin}
      payloadVerified={payloadVerified}
    />
  )
}
