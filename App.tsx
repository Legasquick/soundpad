import React, { useState, useRef, useEffect } from 'react';
import { SoundClip } from './types';
import { Modal } from './components/Modal';
import { ClipEditor } from './components/ClipEditor';
import { Header } from './components/Header';
import { EditBar } from './components/EditBar';
import { SoundGrid } from './components/SoundGrid';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useClips } from './hooks/useClips';
import { useGridDimensions } from './hooks/useGridDimensions';
import { generateSmartColor } from './utils/color';
import { saveFile } from './services/db';
import { findFirstFreeSpot } from './utils/collision';

type ModalType = 'none' | 'createProfile' | 'deleteProfile' | 'deleteAll';

export default function App() {
  const [globalVolume, setGlobalVolume] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingClip, setEditingClip] = useState<SoundClip | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Modal State
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [newProfileName, setNewProfileName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  const { containerRef, gridState } = useGridDimensions();
  const { 
      clips, 
      profiles, 
      currentProfileId, 
      isLoading, 
      saveClip, 
      deleteClip, 
      deleteAllClips,
      moveClip, 
      moveClips, 
      resizeClip, 
      importClips,
      createProfile,
      switchProfile,
      deleteProfile,
      renameProfile
  } = useClips();

  const { playingIds, playSound, stopAll, audioInstances, setInstanceVolume } = useAudioPlayer(globalVolume);

  // Sync mixer changes to DB and Audio Engine
  const handleMixerVolumeChange = (id: string, vol: number) => {
      // 1. Update Audio Engine immediately for responsiveness
      setInstanceVolume(id, vol);
      // 2. Persist to DB (and update React state for UI consistency on reload)
      saveClip({ volume: vol }, null, id);
  };

  // --- Modal Handlers ---
  const handleCreateProfileSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newProfileName.trim()) {
          createProfile(newProfileName.trim());
          setNewProfileName('');
          setActiveModal('none');
      }
  };

  const handleDeleteProfileConfirm = () => {
      deleteProfile(currentProfileId);
      setActiveModal('none');
  };

  const handleDeleteAllConfirm = () => {
      deleteAllClips();
      setActiveModal('none');
  };

  // --- Import/Export ---

  const handleExport = () => {
      const dataStr = JSON.stringify({ profiles, currentProfileId }, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sonicgrid_backup_${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const data = JSON.parse(ev.target?.result as string);
              if (data.profiles && Array.isArray(data.profiles)) {
                  alert("Функция импорта пока поддерживает только структуру клипов. Для полного восстановления базы данных используйте инструменты разработчика или перезагрузите страницу после очистки.");
                  if(data.clips) {
                      importClips(data.clips);
                  } else {
                       if(data.profiles[0]?.clips) {
                           importClips(data.profiles[0].clips);
                       }
                  }

                  alert("Макет загружен! Теперь выберите папку с исходными файлами для восстановления звука.");
                  if (directoryInputRef.current) {
                      directoryInputRef.current.click();
                  }
              } else if (data.clips) {
                  importClips(data.clips);
                  alert("Макет загружен! Теперь выберите папку с исходными файлами для восстановления звука.");
                  if (directoryInputRef.current) {
                      directoryInputRef.current.click();
                  }
              }
          } catch (err) {
              alert("Неверный файл JSON");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; 
  };

  const handleDirectorySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      let restoredCount = 0;
      const fileMap = new Map<string, File>();
      for (let i = 0; i < files.length; i++) {
          fileMap.set(files[i].name, files[i]);
      }
      for (const clip of clips) {
          if (clip.fileName && fileMap.has(clip.fileName) && clip.blobId) {
             await saveFile(clip.blobId, fileMap.get(clip.fileName)!);
             restoredCount++;
          }
      }
      alert(`Восстановлено ${restoredCount} аудиофайлов.`);
      e.target.value = ''; 
  };
  
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if(!files) return;
      
      const tempClips = [...clips];
      
      for (const file of Array.from(files)) {
         const spot = findFirstFreeSpot(1, 1, tempClips, gridState.columns);
         
         const name = file.name.replace(/\.[^/.]+$/, "");
         const color = generateSmartColor(name, tempClips);
         
         const newClipData = {
            name,
            x: spot.x,
            y: spot.y,
            cols: 1,
            rows: 1,
            color,
            fadeInOut: true,
            volume: 1,
            isLooping: true
         };

         await saveClip(newClipData, file);
         
         tempClips.push({
             ...newClipData,
             id: 'temp-' + Math.random(),
             blobId: 'temp',
             fadeInOut: true,
             isLooping: true
         } as SoundClip);
      }
      e.target.value = '';
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500"><div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen flex flex-col font-sans select-none overflow-hidden bg-slate-950">
      <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept="application/json" style={{display:'none'}} />
      <input 
        type="file" 
        ref={directoryInputRef} 
        onChange={handleDirectorySelect} 
        // @ts-ignore
        webkitdirectory="" 
        // @ts-ignore
        directory=""
        multiple 
        style={{display:'none'}} 
      />

      <Header 
        globalVolume={globalVolume}
        isEditMode={isEditMode}
        onVolumeChange={setGlobalVolume}
        onStopAll={stopAll}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        playingIds={playingIds}
        clips={clips}
        audioInstances={audioInstances}
        onInstanceVolumeChange={handleMixerVolumeChange}
        onExport={handleExport}
        onImportClick={() => fileInputRef.current?.click()}
        
        profiles={profiles}
        currentProfileId={currentProfileId}
        onSwitchProfile={switchProfile}
        
        onOpenCreateProfile={() => { setNewProfileName(`Саундпад ${profiles.length + 1}`); setActiveModal('createProfile'); }}
        onOpenDeleteProfile={() => setActiveModal('deleteProfile')}
        onOpenDeleteAll={() => setActiveModal('deleteAll')}
      />

      <main className="flex-1 w-full p-4 overflow-hidden flex flex-col">
        {isEditMode && <EditBar onAdd={() => setIsAddingNew(true)} />}

        <SoundGrid 
            clips={clips}
            playingIds={playingIds}
            isEditMode={isEditMode}
            gridState={gridState}
            containerRef={containerRef}
            onPlay={playSound}
            onEdit={setEditingClip}
            onMoveClip={moveClip}
            onMoveClips={moveClips}
            onResizeClip={resizeClip}
            onSaveClip={saveClip}
            setIsEditMode={setIsEditMode}
            setIsAddingNew={setIsAddingNew}
        />
      </main>

      {/* Clip Editor Modal */}
      <Modal 
        isOpen={!!editingClip || isAddingNew} 
        onClose={() => { setEditingClip(null); setIsAddingNew(false); }}
        title={editingClip ? 'Редактировать звук' : 'Создать тайл'}
      >
        <ClipEditor 
          clip={editingClip || undefined}
          allClips={clips}
          onSave={(data, file) => {
            saveClip(data, file, editingClip?.id);
            setEditingClip(null);
            setIsAddingNew(false);
          }}
          onDelete={(id) => { deleteClip(id); setEditingClip(null); }}
          onClose={() => { setEditingClip(null); setIsAddingNew(false); }}
        />
        {isAddingNew && !editingClip && (
            <div className="mt-6 pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-slate-400 mb-2">Или загрузить файлы массово</label>
                <input type="file" multiple accept="audio/*" onChange={handleBulkUpload} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"/>
            </div>
        )}
      </Modal>

      {/* Create Profile Modal */}
      <Modal
        isOpen={activeModal === 'createProfile'}
        onClose={() => setActiveModal('none')}
        title="Новый профиль"
      >
          <form onSubmit={handleCreateProfileSubmit} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Название</label>
                  <input 
                      type="text" 
                      value={newProfileName}
                      onChange={e => setNewProfileName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                  />
              </div>
              <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setActiveModal('none')} className="px-4 py-2 text-slate-300 hover:text-white">Отмена</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md">Создать</button>
              </div>
          </form>
      </Modal>

      {/* Delete Profile Confirmation */}
      <Modal
        isOpen={activeModal === 'deleteProfile'}
        onClose={() => setActiveModal('none')}
        title="Удалить профиль"
      >
          <div className="space-y-4">
              <p className="text-slate-300">Вы уверены, что хотите удалить текущий профиль? Все связанные звуки будут удалены безвозвратно.</p>
              <div className="flex justify-end gap-3">
                  <button onClick={() => setActiveModal('none')} className="px-4 py-2 text-slate-300 hover:text-white">Отмена</button>
                  <button onClick={handleDeleteProfileConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md">Удалить</button>
              </div>
          </div>
      </Modal>

      {/* Delete All Confirmation */}
      <Modal
        isOpen={activeModal === 'deleteAll'}
        onClose={() => setActiveModal('none')}
        title="Очистить саундпад"
      >
          <div className="space-y-4">
              <p className="text-slate-300">ВНИМАНИЕ: Вы уверены, что хотите удалить ВСЕ звуки на текущем поле? Это действие нельзя отменить.</p>
              <div className="flex justify-end gap-3">
                  <button onClick={() => setActiveModal('none')} className="px-4 py-2 text-slate-300 hover:text-white">Отмена</button>
                  <button onClick={handleDeleteAllConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md">Удалить всё</button>
              </div>
          </div>
      </Modal>

    </div>
  );
}