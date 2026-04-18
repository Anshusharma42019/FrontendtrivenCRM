export default function Modal({ title, onClose, children, hideHeader }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-2xl"
        style={{ border: '1px solid rgba(0,0,0,0.06)', maxHeight: '95dvh' }}>
        {!hideHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">{title}</h3>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-lg leading-none">
              ×
            </button>
          </div>
        )}
        <div className="px-6 py-4 overflow-y-auto modal-scroll-container" style={{ maxHeight: hideHeader ? '95dvh' : 'calc(95dvh - 64px)' }}>{children}</div>
      </div>
    </div>
  );
}
