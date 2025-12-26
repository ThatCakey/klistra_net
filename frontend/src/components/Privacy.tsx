export default function Privacy() {
  return (
    <div className="bg-surface/80 backdrop-blur-md rounded-xl p-8 border border-border-color shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-primary">Privacy Policy</h2>
      <div className="space-y-4 text-on-surface/90">
        <p>
          At Klistra.nu, we prioritize your privacy and security. We are committed to transparency regarding the data we collect and how we use it.
        </p>

        <h3 className="text-xl font-semibold mt-4 text-secondary">Data Collection</h3>
        <p>
          We do not collect any personal information about our users. We do not use cookies for tracking purposes.
        </p>
        <p>
          When you create a "Klister" (paste), we store the encrypted text content, encrypted file metadata, and the expiration time you specify. These are stored as encrypted blobs that we cannot read.
        </p>

        <h3 className="text-xl font-semibold mt-4 text-secondary">Data Storage & Encryption</h3>
        <p>
          All data is stored using industry-standard, post-quantum resistant encryption.
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li><strong>Text & Files:</strong> Encrypted locally in your browser using <code>AES-256-GCM</code> before being sent to our servers.</li>
          <li><strong>Keys:</strong> For password-protected pastes, decryption keys are derived locally from your password using <code>Argon2id</code> and never leave your browser (Zero-Knowledge). For unprotected pastes, a random key is generated and stored on our server to allow anyone with the link to view the content.</li>
          <li><strong>Passwords:</strong> We never receive your password. For protected pastes, we only receive a non-reversible cryptographic hash used to authorize access to your encrypted data.</li>
        </ul>
        <p className="mt-4">
          This architecture ensures that for password-protected content, only you and those you share the password with can access the raw data.
        </p>

        <h3 className="text-xl font-semibold mt-4 text-secondary">Data Retention</h3>
        <p>
          Pastes are automatically deleted from our servers once their expiration time is reached. We do not keep any backups of expired pastes.
        </p>

        <h3 className="text-xl font-semibold mt-4 text-secondary">Transport Security</h3>
        <p>
           All communication between your browser and our servers is encrypted using HTTPS. Additionally, we employ application-layer encryption for paste submission and retrieval to protect against interception.
        </p>

        <div className="mt-8 pt-4 border-t border-border-color">
           <button onClick={() => window.history.back()} className="text-primary hover:underline">Go Back</button>
        </div>
      </div>
    </div>
  );
}
