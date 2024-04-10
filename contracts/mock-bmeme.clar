;; title: mock-bmeme
;; version: 0.0.1
;; summary: for testing purpose only
;; description: a copy of bmeme, for testing purpose only.

;; traits
;;
(impl-trait .trait-ownable.ownable-trait)
(impl-trait .trait-sip-010.sip-010-trait)
(impl-trait .trait-burnable-sip-010.burnable-sip-010-trait)

;; token definitions
;;
(define-fungible-token bmeme)

;; constants
;;

;; errors
;;
(define-constant ERR_INITIALIZED (err u401))
(define-constant ERR_FORBIDDEN (err u403))

;; data vars
;;
(define-data-var token-name (string-ascii 32) "")
(define-data-var token-symbol (string-ascii 32) "")
(define-data-var token-uri (string-utf8 256) u"")
(define-data-var token-decimals uint u0)

(define-data-var owner principal tx-sender)
(define-data-var is-initialized bool false)

;; data maps
;;
(define-map transferer principal bool)
(define-map supply-controller principal bool)

;; initialize function
;;
(define-public (initialize (name (string-ascii 32)) (symbol (string-ascii 32)) (decimals uint) (supply uint) (uri (string-utf8 256)))
  (begin
    ;; check
    (asserts! (is-eq tx-sender (var-get owner)) ERR_FORBIDDEN)
    (asserts! (not (var-get is-initialized)) ERR_INITIALIZED)
    ;; effect
    (var-set is-initialized true)
    (var-set token-name name)
    (var-set token-symbol symbol)
    (var-set token-decimals decimals)
    (var-set token-uri uri)
    (ft-mint? bmeme supply tx-sender)
  )
)

;; public functions
;;
;; @desc transfer
;; @restricted only transferer can transfer the token
;; @param amount uint
;; @param from principal
;; @param to principal
;; @returns (response bool)
(define-public (transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq (default-to false (map-get? transferer contract-caller)) true) ERR_FORBIDDEN)
    (match (ft-transfer? bmeme amount from to)
      response (begin
        (print memo)
        (ok response)
      )
      error (err error)
    )
  )
)

;; read only functions
;;
(define-read-only (get-name) (ok (var-get token-name)))

(define-read-only (get-symbol) (ok (var-get token-symbol)))

(define-read-only (get-decimals) (ok (var-get token-decimals)))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance bmeme who))
)

(define-read-only (get-total-supply) (ok (ft-get-supply bmeme)))

(define-read-only (get-token-uri) (ok (some (var-get token-uri))))

(define-read-only (get-owner) (ok (var-get owner)))

(define-read-only (is-transferer (who principal)) (ok (default-to false (map-get? transferer who))))

(define-read-only (is-supply-controller (who principal)) (ok (default-to false (map-get? supply-controller who))))

;; admin functions
;;
(define-public (transfer-ownership (new-owner principal))
  (begin
    ;; check
    (try! (check-is-owner))
    ;; effect
    (var-set owner new-owner)
    (ok true)
  )
)

(define-public (burn (from principal) (amount uint))
  (begin
    ;; check
    (try! (check-is-supply-controller tx-sender))
    ;; effect
    (ft-burn? bmeme amount from)
  )
)

(define-public (set-transferer (some-transferer principal) (is-allowed bool))
  (begin
    ;; check
    (try! (check-is-owner))
    ;; effect
    (map-set transferer some-transferer is-allowed)
    (ok true)
  )
)

(define-public (set-supply-controller (some-supply-controller principal) (is-allowed bool))
  (begin
    ;; check
    (try! (check-is-owner))
    ;; effect
    (map-set supply-controller some-supply-controller is-allowed)
    (ok true)
  )
)

;; private functions
;;
(define-private (check-is-owner)
  (ok (asserts! (is-eq tx-sender (var-get owner)) ERR_FORBIDDEN))
)

(define-private (check-is-supply-controller (who principal))
  (ok (asserts! (is-eq (default-to false (map-get? supply-controller who)) true) ERR_FORBIDDEN))
)
