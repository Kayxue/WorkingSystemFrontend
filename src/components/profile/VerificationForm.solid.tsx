import { createSignal, For, onCleanup, Show } from 'solid-js';

interface FilePreview {
  file: File;
  url: string;
}

interface VerificationData {
  identificationType?: string;
  identificationNumber?: string;
  approvalStatus?: string;
  verificationDocuments?: {
    originalName: string;
    type: string;
    r2Name: string;
    presignedUrl: string;
  }[];
}

interface VerificationFormProps {
  initialData?: VerificationData;
}

const VerificationForm = (props: VerificationFormProps) => {
  const [documentType, setDocumentType] = createSignal(props.initialData?.identificationType || "personalId");
  const [documentNumber, setDocumentNumber] = createSignal(props.initialData?.identificationNumber || '');
  const [files, setFiles] = createSignal<FilePreview[]>([]);
  const [error, setError] = createSignal('');

  const MAX_FILES = 2;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;

    setError('');
    const newFiles = Array.from(input.files);

    if (files().length + newFiles.length > MAX_FILES) {
      setError(`最多只能上傳 ${MAX_FILES} 個文件。`);
      return;
    }

    const validFiles = newFiles.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`文件格式無效: ${file.name}. 只接受 JPG, PNG, PDF.`);
        return false;
      }
      return true;
    });

    if (error()) return;

    const filePreviews = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));

    setFiles(current => [...current, ...filePreviews]);
  };

  const handleFileDelete = (index: number) => {
    const fileToDelete = files()[index];
    URL.revokeObjectURL(fileToDelete.url); // Clean up memory
    setFiles(current => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('identificationType', documentType());
    formData.append('identificationNumber', documentNumber());
    if (documentType() === 'businessNo') {
      files().forEach(filePreview => {
        formData.append('verificationDocuments', filePreview.file);
      });
    } else if (documentType() === 'personalId') {
      files().forEach(filePreview => {
        formData.append('identificationDocuments', filePreview.file);
      });
    }

    try {
      const response = await fetch('/api/user/update/identification', {
        method: 'PUT',
        body: formData,
        headers: { 'platform': 'web-employer' },
      });
      if (!response.ok) throw new Error('Verification submission failed');
      const result = await response.text();
      alert('驗證資料更新成功！');
      window.location.reload();
    } catch (error) {
      console.error('Error submitting verification:', error);
      setError('提交失敗，請稍後再試。');
    }
  };

  onCleanup(() => {
    files().forEach(file => URL.revokeObjectURL(file.url));
  });

  const getStatusPill = (status: string | undefined) => {
    switch (status) {
      case 'approved':
        return <span class="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">已核准</span>;
      case 'pending':
        return <span class="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">審核中</span>;
      case 'rejected':
        return <span class="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">未通過</span>;
      default:
        return <span class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">未驗證</span>;
    }
  };

  const inputClass = `w-full py-3 px-4 border border-gray-300 rounded-md text-base text-gray-800 placeholder-gray-400 transition-all duration-200 ease-in-out focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`;
  const selectClass = `w-full py-3 px-4 border border-gray-300 rounded-md text-base text-gray-800 placeholder-gray-400 transition-all duration-200 ease-in-out focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`;
  const labelClass = `block mb-2 text-gray-700 text-sm font-bold`;

  return (
    <section>
      <h2 class="text-2xl font-semibold mb-6">身分驗證</h2>
      
      <Show when={props.initialData && (props.initialData.identificationNumber || props.initialData.verificationDocuments?.length)}>
        <div class="mb-8 p-4 bg-gray-50 rounded-lg border">
          <h3 class="text-lg font-semibold mb-3 text-gray-800">已提交的驗證資訊</h3>
          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-600">驗證狀態:</span>
              {getStatusPill(props.initialData.approvalStatus)}
            </div>
            <p><span class="font-medium text-gray-600">文件類型:</span> {props.initialData.identificationType === 'personalId' ? '個人文件' : '經營文件'}</p>
            <p><span class="font-medium text-gray-600">文件編號:</span> {props.initialData.identificationNumber}</p>
            <Show when={props.initialData.verificationDocuments?.length}>
              <div>
                <p class="font-medium text-gray-600 mb-1">已上傳文件:</p>
                <ul class="list-disc pl-5 space-y-1">
                  <For each={props.initialData.verificationDocuments}>
                    {(doc) => <li><a href={doc.presignedUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">{doc.originalName}</a></li>}
                  </For>
                </ul>
              </div>
            </Show>
          </div>
          <p class="text-xs text-gray-500 mt-4">如需更新，請填寫以下表單並提交新的文件，新的文件將會覆蓋舊的資料。</p>
        </div>
      </Show>

      <form onSubmit={handleSubmit} class="w-full max-w-2xl mx-auto">
        
        <div class="mb-4">
          <label for="documentType" class={labelClass}>更新文件類型</label>
          <select id="documentType" value={documentType()} onChange={(e) => setDocumentType(e.currentTarget.value)} class={selectClass}>
            <option value="personalId">個人身分證</option>
            <option value="businessNo">商業統一編號</option>
          </select>
        </div>

        <div class="mb-4">
          <label for="documentNumber" class={labelClass}>更新文件編號</label>
          <input type="text" id="documentNumber" value={documentNumber()} onInput={(e) => setDocumentNumber(e.currentTarget.value)} class={inputClass} placeholder="請輸入新的文件編號" />
        </div>

        <div class="mb-6">
          <label class={labelClass}>上傳新文件 (最多 {MAX_FILES} 個)</label>
          {files().length < MAX_FILES && (
            <div class="relative flex items-center justify-center w-full">
              <label for="file-upload" class="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg class="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                  <p class="mb-2 text-sm text-gray-500"><span class="font-semibold">點擊上傳</span> 或拖曳檔案至此</p>
                  <p class="text-xs text-gray-500">支援格式: PDF, JPG, PNG</p>
                </div>
                <input id="file-upload" type="file" class="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" multiple />
              </label>
            </div>
          )}
          {error() && <p class="mt-2 text-sm text-red-600">{error()}</p>}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <For each={files()}>
            {(filePreview, index) => (
              <div class="relative border rounded-lg p-2 flex flex-col items-center">
                {filePreview.file.type.startsWith('image/') ? (
                  <img src={filePreview.url} alt="Preview" class="w-full h-32 object-cover rounded-md mb-2" />
                ) : (
                  <div class="w-full h-32 flex flex-col justify-center items-center bg-gray-100 rounded-md mb-2">
                    <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span class="text-sm text-gray-600 mt-2">PDF Document</span>
                  </div>
                )}
                <p class="text-xs text-gray-700 truncate w-full text-center" title={filePreview.file.name}>{filePreview.file.name}</p>
                <button onClick={() => handleFileDelete(index())} type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs leading-none w-5 h-5 flex items-center justify-center hover:bg-red-600">&times;</button>
              </div>
            )}
          </For>
        </div>

        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-end mt-8 gap-4 md:gap-6">
          <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md focus:outline-none focus:shadow-outline w-full md:w-auto" disabled={files().length === 0 && documentNumber() === props.initialData?.identificationNumber}>
            提交更新
          </button>
        </div>
      </form>
    </section>
  );
};

export default VerificationForm;
