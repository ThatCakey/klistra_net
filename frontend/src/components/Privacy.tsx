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
          When you create a "Klister" (paste), we store the encrypted text content and the expiration time you specify.
        </p>

        <h3 className="text-xl font-semibold mt-4 text-secondary">Data Storage</h3>
        <p>
          All data is stored encrypted. We use industry-standard encryption algorithms (XChaCha20-Poly1305 and Argon2id) to ensure your data remains secure.
        </p>
        <p>
          We do not have access to your passwords or the raw content of your pastes if they are password-protected.
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
