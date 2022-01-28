import { createMessage, decrypt, encrypt, PrivateKey, readMessage } from "openpgp";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { IStoredKey } from "../../../../types/types";
import CopyToClipboard from "../../../Shared/CopyToClipboard";
import Modal from "../../../Shared/Modal";
import { useTranslation } from "react-i18next";
import "./index.scss";
import { VaultContext } from "../../store";
import { decryptKey, readPrivateKey } from "openpgp";
import SelectKeyModal from "../SelectKeyModal/SelectKeyModal";


export async function readPrivateKeyFromStoredKey({ passphrase, privateKey }: IStoredKey) {
  return passphrase ? await decryptKey({
    privateKey: await readPrivateKey({ armoredKey: privateKey }),
    passphrase
  }) : await readPrivateKey({ armoredKey: privateKey })
}


export default function Decrypt() {
  const vaultContext = useContext(VaultContext)
  const [showSelectKeyModal, setShowSelectKeyModal] = useState(false)
  const [error, setError] = useState<string>();
  const encryptedMessageRef = useRef<HTMLTextAreaElement>(null);
  const decryptedMessageRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    console.log("vaultContext", vaultContext)
    // if vault has no keys, show modal to add one  
    if (vaultContext.vault?.storedKeys.length === 0) {
      setShowSelectKeyModal(true)
    }
  }, [vaultContext.vault])

  const _decrypt = useCallback(async () => {
    try {
      setError("")
      if (!vaultContext.selectedKey) {
        setShowSelectKeyModal(true)
        return
      }
      const privateKey = await readPrivateKeyFromStoredKey(vaultContext.selectedKey)
      const armoredMessage = encryptedMessageRef.current!.value
      const message = await readMessage({ armoredMessage })
      const { data: decrypted } = await decrypt({ message, decryptionKeys: privateKey })
      decryptedMessageRef.current!.value = decrypted
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      }
    }
  }, [vaultContext.selectedKey])

  const _encrypt = useCallback(async () => {
    try {
      setError("")
      if (!vaultContext.selectedKey) {
        setShowSelectKeyModal(true)
        return
      }
      const privateKey = await readPrivateKeyFromStoredKey(vaultContext.selectedKey)
      const message = await createMessage({ text: decryptedMessageRef.current!.value })
      encryptedMessageRef.current!.value = await encrypt({ message, encryptionKeys: privateKey?.toPublic() })
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      }
    }
  }, [vaultContext.selectedKey])

  return (
    <div>
      <p>selected Keypair</p>
      {vaultContext.selectedKey ? <p>{vaultContext.selectedKey.alias}</p> : <p>none</p>}
      <button onClick={() => {
        setShowSelectKeyModal(true)
      }}>select keypair</button>
      <p>{t("CommitteeTools.Decrypt.encrypted-message")}</p>
      <textarea ref={encryptedMessageRef} cols={80} rows={15} />
      {error && <p>{error}</p>}
      <div><button onClick={_decrypt}>Decrypt</button></div>
      <p>Decrypted message</p>
      <textarea ref={decryptedMessageRef} cols={80} rows={15} />
      <div><button onClick={_encrypt}>Encrypt</button></div>
      {showSelectKeyModal && <SelectKeyModal
        onSelectKey={() => {
        }}
        setShowModal={setShowSelectKeyModal} />}
    </div>
  )
}

