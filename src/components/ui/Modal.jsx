export default function Modal({ title, onClose, children, hideHeader }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh]"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        {!hideHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">{title}</h3>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-lg leading-none">
              ×
            </button>
          </div>
        )}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: hideHeader ? '95vh' : 'calc(95vh - 64px)' }}>{children}</div>
      </div>
    </div>
  );
}
