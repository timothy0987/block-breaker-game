import React, { useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { Loader2 } from 'lucide-react';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgEzvkA3w');

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROW_COUNT = 6;
const BRICK_COLUMN_COUNT = 10;
const BRICK_WIDTH = 65;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 35;

type GameState = 'start' | 'playing' | 'gameover' | 'won';

export default function BlockBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Game references to avoid stale closures in requestAnimationFrame
  const gameStateRef = useRef(gameState);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    scoreRef.current = 0;
    livesRef.current = 3;
    setTxSignature(null);
  };

  const publishScore = async () => {
    if (!publicKey || !sendTransaction) return;

    try {
      setIsSubmitting(true);
      const memoText = `Neon Breaker Game Over - Final Score: ${score}`;
      
      const instruction = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoText, 'utf-8'),
      });

      const transaction = new Transaction().add(instruction);
      
      // Get the latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      setTxSignature(signature);
    } catch (error) {
      console.error('Error recording score:', error);
      alert('Transaction failed!');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Game Variables
    let x = CANVAS_WIDTH / 2;
    let y = CANVAS_HEIGHT - 30;
    let dx = 4;
    let dy = -4;
    let paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    let rightPressed = false;
    let leftPressed = false;
    let requestID: number;

    const bricks: { x: number; y: number; status: number }[][] = [];
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
      bricks[c] = [];
      for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }

    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
    };
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
      else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
    };
    const mouseMoveHandler = (e: MouseEvent) => {
      const relativeX = e.clientX - canvas.offsetLeft;
      if (relativeX > 0 && relativeX < canvas.width) {
         // paddleX = relativeX - PADDLE_WIDTH / 2;
      }
    };

    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);
    document.addEventListener('mousemove', mouseMoveHandler, false);

    const collisionDetection = () => {
      for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
          const b = bricks[c][r];
          if (b.status === 1) {
            if (x > b.x && x < b.x + BRICK_WIDTH && y > b.y && y < b.y + BRICK_HEIGHT) {
              dy = -dy;
              b.status = 0;
              scoreRef.current += 10;
              setScore(scoreRef.current);
              
              if (scoreRef.current === BRICK_ROW_COUNT * BRICK_COLUMN_COUNT * 10) {
                setGameState('won');
              }
            }
          }
        }
      }
    };

    const drawBall = () => {
      ctx.beginPath();
      ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#00f3ff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f3ff';
      ctx.fill();
      ctx.closePath();
      ctx.shadowBlur = 0; // reset
    };

    const drawPaddle = () => {
      ctx.beginPath();
      ctx.roundRect(paddleX, canvas.height - PADDLE_HEIGHT - 5, PADDLE_WIDTH, PADDLE_HEIGHT, 5);
      const gradient = ctx.createLinearGradient(paddleX, 0, paddleX + PADDLE_WIDTH, 0);
      gradient.addColorStop(0, '#9d00ff');
      gradient.addColorStop(1, '#ff00ea');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.closePath();
    };

    const drawBricks = () => {
      for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
          if (bricks[c][r].status === 1) {
            const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
            const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
            bricks[c][r].x = brickX;
            bricks[c][r].y = brickY;
            ctx.beginPath();
            ctx.roundRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT, 4);
            
            // Generate neon colors based on row
            const hue = (r * 40 + 200) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.fill();
            ctx.closePath();
          }
        }
      }
    };

    const draw = () => {
      if (gameStateRef.current !== 'playing') return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBricks();
      drawBall();
      drawPaddle();
      collisionDetection();

      // Wall collision logic
      if (x + dx > canvas.width - BALL_RADIUS || x + dx < BALL_RADIUS) dx = -dx;
      if (y + dy < BALL_RADIUS) dy = -dy;
      else if (y + dy > canvas.height - BALL_RADIUS - 5) {
        if (x > paddleX && x < paddleX + PADDLE_WIDTH) {
          // Angle modifier based on where it hit the paddle
          const hitPoint = (x - (paddleX + PADDLE_WIDTH/2)) / (PADDLE_WIDTH/2);
          dx = hitPoint * 6; // Max angle deflection
          dy = -Math.abs(dy); // Ensure it goes up
        } else {
          livesRef.current--;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            setGameState('gameover');
            return;
          } else {
            // Reset ball and paddle
            x = canvas.width / 2;
            y = canvas.height - 30;
            dx = 4;
            dy = -4;
            paddleX = (canvas.width - PADDLE_WIDTH) / 2;
          }
        }
      }

      if (rightPressed && paddleX < canvas.width - PADDLE_WIDTH) {
        paddleX += 7;
      } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
      }

      x += dx;
      y += dy;
      requestID = requestAnimationFrame(draw);
    };

    if (gameState === 'playing') {
      draw();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBricks();
      drawPaddle();
    }

    return () => {
      cancelAnimationFrame(requestID);
      document.removeEventListener('keydown', keyDownHandler);
      document.removeEventListener('keyup', keyUpHandler);
      document.removeEventListener('mousemove', mouseMoveHandler);
    };
  }, [gameState]);

  return (
    <div className="game-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' }}>
        <span style={{ color: 'var(--neon-blue)' }}>SCORE: {score}</span>
        <span style={{ color: 'var(--neon-pink)' }}>LIVES: {lives}</span>
      </div>
      
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
        
        {gameState !== 'playing' && (
          <div className="overlay">
            {gameState === 'start' && (
              <>
                <h2>NEON BREAKER</h2>
                <button className="btn" onClick={startGame}>START GAME</button>
              </>
            )}
            
            {(gameState === 'gameover' || gameState === 'won') && (
              <>
                <h2>{gameState === 'won' ? 'YOU WIN!' : 'GAME OVER'}</h2>
                <div className="score-display">FINAL SCORE: <strong style={{color: '#fff'}}>{score}</strong></div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn" onClick={startGame}>PLAY AGAIN</button>
                  
                  {publicKey ? (
                     <button 
                        className="btn" 
                        onClick={publishScore} 
                        disabled={isSubmitting || txSignature !== null}
                        style={{ background: 'linear-gradient(45deg, var(--neon-purple), var(--neon-pink))' }}
                      >
                       {isSubmitting ? (
                         <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <Loader2 size={18} className="animate-spin" /> Signing...
                         </span>
                       ) : txSignature ? (
                         'RECORDED ✓'
                       ) : (
                         'RECORD ON BLOCKCHAIN'
                       )}
                     </button>
                  ) : (
                    <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#888' }}>
                      Connect wallet to record score top right
                    </div>
                  )}
                </div>

                {txSignature && (
                  <div className="tx-status">
                     Score successfully recorded on Devnet!<br/>
                     <a 
                       href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="tx-link"
                     >
                       View Transaction ↗
                     </a>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
