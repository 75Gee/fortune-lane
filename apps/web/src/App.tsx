import { AlertCircle, X, RotateCcw } from 'lucide-react'
import { HomePage } from './pages/HomePage.js'
import { LobbyPage } from './pages/LobbyPage.js'
import { GamePage } from './pages/GamePage.js'
import { useGameConnection } from './socket/useGameConnection.js'
import { ModalErrorContext, CommandAvailabilityContext } from './components/Modal.js'
import { Reactions } from './components/Reactions.js'

export function App() {
  const connection = useGameConnection()
  const state = connection.serverState

  let content
  if (!connection.session || !state || state.room.roomCode !== connection.session.roomCode) {
    content = (
      <HomePage
        connected={connection.status === 'connected'}
        onCreate={connection.createRoom}
        onJoin={connection.joinRoom}
        pending={connection.requestPending}
        savedRooms={connection.savedRooms}
        savedRoomsStatus={connection.savedRoomsStatus}
        removedRoomCount={connection.removedRoomCount}
        onRemoveSavedRooms={connection.forgetSavedRooms}
        onUndoRemoveSavedRooms={connection.undoForgetSavedRooms}
        onResume={connection.resumeRoom}
      />
    )
  } else if (state.room.phase === 'lobby') {
    content = (
      <LobbyPage
        room={state.room}
        playerId={connection.session.playerId}
        onReady={connection.setReady}
        onStart={connection.startGame}
        onLeave={connection.leaveRoom}
        pending={connection.requestPending}
        connected={connection.status === 'connected'}
      />
    )
  } else if (state.game) {
    content = (
      <GamePage
        key={`${state.room.roomCode}-${connection.presentationVersion}`}
        room={state.room}
        game={state.game}
        playerId={connection.session.playerId}
        events={connection.events}
        connectionStatus={connection.status}
        onCommand={connection.sendCommand}
        commandPending={connection.requestPending || connection.retryAvailable}
        onRestart={connection.restartGame}
        onLeave={connection.leaveRoom}
      />
    )
  } else {
    content = null
  }

  return (
    <CommandAvailabilityContext.Provider value={connection.status === 'connected' && !connection.requestPending && !connection.retryAvailable}>
    <ModalErrorContext.Provider value={{ error: connection.error, clear: connection.clearError, ...(connection.retryAvailable ? { retry: connection.retryCommand } : {}) }}>
      {content}
      {state?.game && connection.session && state.room.roomCode === connection.session.roomCode && <Reactions room={state.room} reactions={connection.reactions} onSend={connection.sendReaction} connected={connection.status === 'connected'} />}
      {(connection.error || connection.retryAvailable) && (
        <div className="error-toast" role="alert">
          <AlertCircle size={19} />
          <span>{connection.error ?? '上次操作尚未确认，请重试确认'}</span>
          {connection.retryAvailable && <button onClick={connection.retryCommand} title="重试确认" aria-label="重试确认"><RotateCcw size={18} /></button>}
          <button onClick={connection.clearError} aria-label="关闭提示"><X size={17} /></button>
        </div>
      )}
    </ModalErrorContext.Provider>
    </CommandAvailabilityContext.Provider>
  )
}
