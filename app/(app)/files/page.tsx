import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { redirect } from "next/navigation";
import { PageHeader, Empty } from "@/components/ui";
import { getCtx } from "@/lib/permissions/owner";
import { createDownloadUrl, getS3Client, getStorageConfig, MAX_UPLOAD_BYTES } from "@/lib/storage/s3";
import { deleteFile, uploadFile } from "@/features/storage/actions";

type SP = { error?: string; uploaded?: string; deleted?: string };

const errors: Record<string, string> = {
  "not-configured": "S3 is not configured on this deployment yet. Add the AWS variables in Cloudflare Worker settings.",
  "choose-file": "Choose a non-empty file to upload.",
  "too-large": "That file is larger than the 8 MB upload limit.",
  "upload-failed": "Upload failed. Check the bucket, IAM permissions, and Cloudflare secrets.",
  "delete-failed": "Could not delete that file. Check the bucket and IAM permissions.",
  "invalid-file": "That file reference is invalid.",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function FilesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await getCtx();
  const config = getStorageConfig();
  const client = getS3Client();
  if (!config || !client) {
    return (
      <>
        <PageHeader title="Files" subtitle="Private cloud storage for your dashboard." />
        <section className="card">
          <h2>Connect AWS S3</h2>
          <p className="muted">The S3 feature is ready, but Cloudflare needs the bucket and server-side credentials configured before it can list or upload files.</p>
          <p><strong>Bucket:</strong> my-files-buckets0-2027</p>
          <p><strong>Region:</strong> eu-north-1</p>
          <p className="small muted">Add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME as Worker variables/secrets. Never use NEXT_PUBLIC_ for AWS credentials.</p>
        </section>
      </>
    );
  }

  let objects: { key: string; size: number; lastModified?: Date; downloadUrl: string; name: string }[] = [];
  let listFailed = false;
  try {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: `users/${user.id}/`,
      MaxKeys: 200,
    }));
    objects = await Promise.all((result.Contents ?? []).filter((o): o is typeof o & { Key: string } => Boolean(o.Key)).map(async (o) => ({
      key: o.Key,
      size: o.Size ?? 0,
      lastModified: o.LastModified,
      downloadUrl: await createDownloadUrl(config.bucket, o.Key),
      name: o.Metadata?.originalname ?? o.Key.split("/").pop() ?? "File",
    })));
  } catch {
    listFailed = true;
  }

  return (
    <>
      <PageHeader title="Files" subtitle="Private S3 storage. Files are scoped to your signed-in owner account." />
      {sp.error && <p className="err" role="alert">{errors[sp.error] ?? "Something went wrong."}</p>}
      {sp.uploaded && <p className="success" role="status">File uploaded successfully.</p>}
      {sp.deleted && <p className="success" role="status">File deleted.</p>}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Upload a file</h2>
        <p className="muted small">Maximum file size: {formatBytes(MAX_UPLOAD_BYTES)}. Files stay private in your S3 bucket.</p>
        <form action={uploadFile} className="row" style={{ alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, flex: "1 1 260px" }}>
            <span className="small">Choose file</span>
            <input type="file" name="file" required />
          </label>
          <button className="btn" type="submit">Upload to S3</button>
        </form>
      </section>
      <section className="card">
        <h2>Your files</h2>
        {listFailed && <p className="err" role="alert">Could not list files. Verify the S3 bucket name and IAM permissions.</p>}
        {!listFailed && objects.length === 0 && <Empty title="No files yet" hint="Upload your first file above. It will be stored under your private user prefix." />}
        {!listFailed && objects.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {objects.map((file) => (
              <article key={file.key} className="row" style={{ justifyContent: "space-between", borderBottom: "1px solid var(--border, #ddd)", paddingBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ overflowWrap: "anywhere" }}>{file.name}</strong>
                  <div className="small muted">{formatBytes(file.size)}{file.lastModified ? ` · ${file.lastModified.toLocaleString()}` : ""}</div>
                </div>
                <div className="row">
                  <a className="btn secondary sm" href={file.downloadUrl}>Download</a>
                  <form action={deleteFile}>
                    <input type="hidden" name="key" value={file.key} />
                    <button className="btn danger sm" type="submit">Delete</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
