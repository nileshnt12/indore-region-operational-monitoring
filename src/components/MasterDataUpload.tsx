import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DatabaseZap, FileSpreadsheet, UploadCloud } from 'lucide-react'
import { replaceOfficeMaster } from '../services/masterDataService'
import type { OfficeMasterUploadRow } from '../types/masterData'
import { parseOfficeMasterFile } from '../utils/masterDataParser'

interface MasterDataUploadProps {
  onUpdated: () => void
}

export function MasterDataUpload({ onUpdated }: MasterDataUploadProps) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<OfficeMasterUploadRow[]>([])
  const [missingColumns, setMissingColumns] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const previewRows = useMemo(() => rows.slice(0, 5), [rows])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setMessage('')
    setMissingColumns([])
    setRows([])

    if (!file) return

    setFileName(file.name)
    try {
      const parsed = await parseOfficeMasterFile(file)
      setMissingColumns(parsed.missingColumns)
      setRows(parsed.rows)
      if (parsed.missingColumns.length) {
        setMessage(`Missing required columns in ${parsed.sheetName}.`)
      } else {
        setMessage(`${parsed.rows.length.toLocaleString('en-IN')} valid office rows found.`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to read selected file.')
    }
  }

  async function handleReplaceMaster() {
    if (!rows.length) return
    setBusy(true)
    setMessage('Replacing office master data...')
    try {
      const updatedRows = await replaceOfficeMaster(rows)
      setMessage(`Office master updated successfully. ${updatedRows.toLocaleString('en-IN')} rows saved.`)
      onUpdated()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update office master.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="master-data" className="panel master-panel">
      <div className="section-heading">
        <div>
          <h2>Create/Update Master Data</h2>
          <p>Upload Excel or CSV master data and replace the existing office master table</p>
        </div>
      </div>

      <div className="upload-zone">
        <div className="upload-icon"><FileSpreadsheet size={24} /></div>
        <div>
          <h3>Office_Master file</h3>
          <p>Excel files must contain a sheet named Office_Master. CSV files should use the same columns.</p>
        </div>
        <label className="upload-button">
          <UploadCloud size={17} />
          Choose File
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
        </label>
      </div>

      {fileName ? <p className="upload-file-name">{fileName}</p> : null}

      {missingColumns.length ? (
        <div className="validation-message" role="alert">
          Missing: {missingColumns.join(', ')}
        </div>
      ) : null}

      {message ? <div className="upload-message">{message}</div> : null}

      {previewRows.length ? (
        <>
          <div className="master-actions">
            <button className="primary-button" type="button" onClick={handleReplaceMaster} disabled={busy}>
              <DatabaseZap size={17} />
              {busy ? 'Updating...' : 'Replace Office Master'}
            </button>
          </div>
          <div className="table-scroll compact-table">
            <table>
              <thead>
                <tr>
                  <th>Circle</th>
                  <th>Region</th>
                  <th>Division</th>
                  <th>Sub Division</th>
                  <th>Office Name</th>
                  <th>Alternate Office Name</th>
                  <th>office_id</th>
                  <th>pincode</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={`${row.office_id}-${row.office_name}`}>
                    <td>{row.circle}</td>
                    <td>{row.region}</td>
                    <td>{row.division}</td>
                    <td>{row.sub_division}</td>
                    <td>{row.office_name}</td>
                    <td>{row.alternate_office_name}</td>
                    <td>{row.office_id}</td>
                    <td>{row.pincode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  )
}
