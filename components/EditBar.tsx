import React from 'react';

interface EditBarProps {
  onAdd: () => void;
}

export const EditBar: React.FC<EditBarProps> = ({ onAdd }) => {
  return (
    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col sm:flex-row gap-4 items-center justify-between animate-in slide-in-from-top-2">
      <div className="text-amber-200 text-sm">
        <strong className="text-amber-400 block mb-1">Режим редактирования</strong>
        <ul className="list-disc list-inside space-y-1">
            <li>Перетаскивайте тайлы свободно по сетке.</li>
            <li>Тяните за <strong>края</strong> чтобы изменить размер.</li>
            <li>Нажмите <strong>иконку карандаша</strong> чтобы изменить свойства.</li>
            <li>Используйте выделение мышью или Shift+Клик для групп.</li>
        </ul>
      </div>
      <button 
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded shadow-sm font-semibold transition-transform hover:scale-105"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Добавить звук
      </button>
    </div>
  );
};