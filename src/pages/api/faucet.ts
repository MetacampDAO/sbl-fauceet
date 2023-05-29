import { createTransfer } from '@solana/pay';
import { PublicKey, Transaction, Connection, Keypair, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import BigNumber from 'bignumber.js';
import { NextApiHandler } from 'next';

const walletPrivateKey = process.env.SBL_FAUCET_KEYPAIR!;
const walletKeypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(walletPrivateKey)));

interface PostResponse {
    transaction: string;
    message?: string;
}

const post: NextApiHandler<PostResponse> = async (request, response) => {
    const destPubkey = request.body.destPubKey;
    const triggerPubKey = request.body.triggerPubKey;
    const AMOUNT = 2e9;

    const connectionUrl = process.env.CLUSTER_ENDPOINT || 'https://api.devnet.solana.com';
    const connection = new Connection(connectionUrl, 'confirmed');
    const { blockhash } = await connection.getLatestBlockhash();
    const transferIx = SystemProgram.transfer({
        fromPubkey: walletKeypair.publicKey,
        toPubkey: new PublicKey(destPubkey),
        lamports: AMOUNT,
    });
    const transferIx2 = SystemProgram.transfer({
        fromPubkey: walletKeypair.publicKey,
        toPubkey: new PublicKey(triggerPubKey),
        lamports: 1,
    });
    const transferIx3 = SystemProgram.transfer({
        fromPubkey: new PublicKey(triggerPubKey),
        toPubkey: walletKeypair.publicKey,
        lamports: 1,
    });

    let transaction = new Transaction().add(transferIx);
    transaction.add(transferIx2);
    transaction.add(transferIx3);

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;
    transaction.partialSign(walletKeypair)
    transaction = Transaction.from(
        transaction.serialize({
            verifySignatures: false,
            requireAllSignatures: false,
        })
    );

    const serialized = transaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
    });
    const base64 = serialized.toString('base64');

    response.status(200).send({
        transaction: base64,
    });
};

const index: NextApiHandler<PostResponse> = async (request, response) => {
    if (request.method === 'POST') return post(request, response);

    throw new Error(`Unexpected method ${request.method}`);
};

export default index;
