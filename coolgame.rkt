#lang racket

(require racket/gui)
(require racket/draw)

(define x-max 512)
(define y-max 384)
(define num-stars 100)
(define ship-size 15)
(define blur-alpha 0.2)

(define speed-max 15)
(define friction-mod 1.2)
(define friction-mod-floor 0.1) ; Set it to zero below this floor.
(define delta-x (box 0.0))
(define delta-y (box 0.0))
(define fireline-size 10)
(define fireline-speed 20)

(define main-buffer (make-bitmap x-max y-max))
(define main-dc (new bitmap-dc% [bitmap main-buffer]))

(define firelines (list))

(struct starpoint (x y speed) #:mutable)


(define starfield (build-list num-stars 
	(lambda (x) (starpoint (random x-max) (random y-max) (+ 1 (random 15)))) ))

(define starship (make-object point% (/ x-max 10) (/ y-max 2)))

(define (move-stars)
	(map (lambda (i)
		(set-starpoint-x! i (- (starpoint-x i) (starpoint-speed i)))
		(when (< (starpoint-x i) 0) (set-starpoint-x! i x-max)))
		starfield))


(define (move-firelines)
	(map (lambda (i)
		(send i set-x (+ (send i get-x) fireline-speed))
		(when (> (send i get-x) x-max)
			(set! firelines (remove i firelines))))
		firelines))

(define (move-ship)
	(send starship set-x (+ (send starship get-x) (unbox delta-x)))
	(send starship set-y (+ (send starship get-y) (unbox delta-y)))
	(set-box! delta-x (/ (unbox delta-x) friction-mod))
	(set-box! delta-y (/ (unbox delta-y) friction-mod))
	(when (< (abs (unbox delta-x)) friction-mod-floor) (set-box! delta-x 0))
	(when (< (abs (unbox delta-y)) friction-mod-floor) (set-box! delta-y 0)))


(define (lower-alpha pen amount)
	(let ([col (send pen get-color)])
		(new pen% 
			[ color (make-object color% (send col red) (send col green) (send col blue) amount) ]
			[ width (+ (send pen get-width) 3) ] )))

(define (restore-alpha pen)
	(let ([col (send pen get-color)])
		(new pen% 
			[ color (make-object color% (send col red) (send col green) (send col blue) 1.0) ]
			[ width (- (send pen get-width) 3) ] )))


(define (draw-line ctx point1 point2)
	(send ctx set-pen (lower-alpha (send ctx get-pen) blur-alpha))
	(send ctx draw-line
		(+ 1 (send point1 get-x))
		(+ 1 (send point1 get-y))
		(+ 1 (send point2 get-x))
		(+ 1 (send point2 get-y)))
	(send ctx set-pen (lower-alpha (send ctx get-pen) (/ blur-alpha 2) ))
	(send ctx draw-line
		(- (send point1 get-x) 1)
		(- (send point1 get-y) 1)
		(- (send point2 get-x) 1)
		(- (send point2 get-y) 1))

	(send ctx set-pen (restore-alpha (send ctx get-pen)))
	(send ctx set-pen (restore-alpha (send ctx get-pen)))
	(send ctx draw-line
		(send point1 get-x) 
		(send point1 get-y) 
		(send point2 get-x) 
		(send point2 get-y))
)

(define (draw-firelines)
	(send main-dc set-pen "white" 1 'solid)
	(map 
		(lambda (i)
			(draw-line main-dc i (make-object point% (+ (send i get-x) fireline-size) (send i get-y))))
		firelines))


; This can probably be broken into smaller, better functions--
(define (redraw-main-buffer)
	; Background
	(send main-dc set-brush "white" 'solid)
	(send main-dc set-pen "white" 0 'solid)
    (send main-dc set-background "black")
	(send main-dc clear)
	(move-stars)
	(move-ship)
    (move-firelines)
	(map
		(lambda (i) (send main-dc draw-rectangle (starpoint-x i) (starpoint-y i) 1 1))
		starfield)
	(draw-firelines)
	; Player's ship
	(send main-dc set-pen "green" 1 'solid)
	(let (
		[p1 (make-object point% 
			(- (send starship get-x) (/ ship-size 2)) 
			(- (send starship get-y) (/ ship-size 2)) )]
		[p2 (make-object point%
			(+ (send starship get-x) (/ ship-size 2))
			(send starship get-y))]
		[p3 (make-object point%
			(- (send starship get-x) (/ ship-size 4))
			(send starship get-y))]
		[p4 (make-object point% 
			(- (send starship get-x) (/ ship-size 2)) 
			(+ (send starship get-y) (/ ship-size 2)) )]) 
		(draw-line main-dc p1 p2)
		(draw-line main-dc p1 p3)
		(draw-line main-dc p3 p4)
		(draw-line main-dc p4 p2)))

(define (repaint canvas dc)
    (redraw-main-buffer)
	(send dc set-scale 
		(/ (send main-window get-width) x-max) (/ (send main-window get-height) y-max))
    (send dc draw-bitmap main-buffer 0 0))

(define main-window (new (class frame%
        (super-new
			[label "Cool Game"]
			[width 640]
			[height 480] )
		(define/augment (on-close) 
			(exit 0)) ) ))


(define (move direction)
	(when (eq? direction 'up) (set-box! delta-y (* -1 speed-max)))
	(when (eq? direction 'down) (set-box! delta-y speed-max))
	(when (eq? direction 'left) (set-box! delta-x (* -1 speed-max)))
	(when (eq? direction 'right) (set-box! delta-x speed-max)))



(define main-canvas 
	(new (class canvas% 
		(super-new 
			[parent main-window]
        	[paint-callback repaint])
		(define/override (on-char key-event)
			(when (member (send key-event get-key-code) (list 'up 'down 'left 'right))
				(move (send key-event get-key-code)))
			(when (eq? (send key-event get-key-code) #\space)
				(set! firelines (append firelines (list (make-object point% (send starship get-x) (send starship get-y)))))) ))) )


(send main-window show #t)

(define timer (new timer% 
	[notify-callback (lambda () (send main-canvas refresh-now))] 
	[interval 40]))


