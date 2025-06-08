export default function MessageAlert({ message }) {
  if (!message.text) return null;

  const bgColor = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700'
  }[message.type] || 'bg-gray-100 border-gray-400 text-gray-700';

  return (
    <div className={`border-l-4 p-4 mb-4 ${bgColor}`}>
      <p className="text-sm">{message.text}</p>
    </div>
  );
}
