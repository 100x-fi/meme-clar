;; title: meme-vester
;; version: 0.0.1
;; summary: vesting contract for meme
;; description: a contract for converting bmeme to meme through vesting

;; traits
;;
(impl-trait .trait-ownable.ownable-trait)
(use-trait burnable-sip-010-trait .trait-burnable-sip-010.burnable-sip-010-trait)
(use-trait sip-010-trait .trait-sip-010.sip-010-trait)

;; token definitions
;;

;; constants
;;
(define-constant ONE_YEAR u31536000)

;; errors
;;
(define-constant ERR_BAD_PARAMS (err u400))
(define-constant ERR_INITIALIZED (err u401))
(define-constant ERR_ALREADY_CLAIMED (err u402))
(define-constant ERR_FORBIDDEN (err u403))
(define-constant ERR_NOT_EXISTED (err u404))
(define-constant ERR_GET_BLOCK_INFO (err u501))

;; data vars
;;
(define-data-var is-initialized bool false)
(define-data-var owner principal tx-sender)
(define-data-var bmeme principal tx-sender)
(define-data-var meme principal tx-sender)

;; mock vars
;;
(define-data-var mock-timestamp uint u0)

;; data maps
;;
(define-map vesting-positions 
  { 
    user: principal, index: uint 
  } 
  {
    amount: uint,
    start-at: uint,
    end-at: uint,
    last-claimed-at: uint,
    has-claimed: bool
  }
)
(define-map user-last-vesting-index principal uint)

;; initialize function
;;
(define-public (initialize (init-bmeme <sip-010-trait>) (init-meme <sip-010-trait>))
  (begin
    (try! (check-is-owner))
    (asserts! (is-eq (var-get is-initialized) false) ERR_INITIALIZED)
    (var-set is-initialized true)
    (var-set bmeme (contract-of init-bmeme))
    (var-set meme (contract-of init-meme))
    (ok true)
  )
)

;; public functions
;;
(define-public (vest (vest-bmeme <sip-010-trait>) (amount uint))
  (let
    (
      (local-user-last-vesting-index (default-to u0 (map-get? user-last-vesting-index tx-sender)))
      (vesting-data {
        amount: amount,
        start-at: (try! (get-block-timestamp)),
        end-at: (+ (try! (get-block-timestamp)) ONE_YEAR),
        last-claimed-at: (try! (get-block-timestamp)),
        has-claimed: false
      })
      (vester tx-sender)
    )
    ;; check
    (asserts! (is-eq (contract-of vest-bmeme) (var-get bmeme)) ERR_BAD_PARAMS)
    (asserts! (is-eq (> amount u0) true) ERR_BAD_PARAMS)
    ;; effect
    (map-set vesting-positions { user: tx-sender, index: local-user-last-vesting-index } vesting-data)
    (map-set user-last-vesting-index tx-sender (+ local-user-last-vesting-index u1))
    ;; interaction
    (as-contract (try! (contract-call? vest-bmeme transfer amount vester .meme-vester none)))
    (ok true)
  )
)

(define-public (claim (c-bmeme <burnable-sip-010-trait>) (c-meme <sip-010-trait>) (index uint))
  (let
    (
      (local-vesting-info (try! (get-vesting-info tx-sender index)))
      (local-amount (get amount local-vesting-info))
      (local-start-at (get start-at local-vesting-info))
      (local-end-at (get end-at local-vesting-info))
      (local-last-claimed-at (get last-claimed-at local-vesting-info))
      (local-has-claimed (get has-claimed local-vesting-info))
      (local-block-timestamp (try! (get-block-timestamp)))
      (local-claimable (get claimable local-vesting-info))
      (vester tx-sender)
    )
    ;; check
    (asserts! (is-eq (contract-of c-bmeme) (var-get bmeme)) ERR_BAD_PARAMS)
    (asserts! (is-eq (contract-of c-meme) (var-get meme)) ERR_BAD_PARAMS)
    (asserts! (> local-amount u0) ERR_NOT_EXISTED)
    (asserts! (is-eq local-has-claimed false) ERR_ALREADY_CLAIMED)
    ;; effect
    (map-set vesting-positions { user: tx-sender, index: index} {
      amount: local-amount,
      start-at: local-start-at,
      end-at: local-end-at,
      last-claimed-at: local-block-timestamp,
      has-claimed: (>= local-block-timestamp local-end-at)
    })
    ;; interaction
    ;; transfer meme to tx-sender
    (as-contract (try! (contract-call? c-meme transfer local-claimable .meme-vester vester none)))
    ;; burn bmeme
    (as-contract (try! (contract-call? c-bmeme burn .meme-vester local-claimable)))
    (ok true)
  )
)

;; read only functions
;;
(define-read-only (get-owner) (ok (var-get owner)))

(define-read-only (get-vesting-info (user principal) (index uint)) 
  (let
    (
      (local-vesting-data (map-get? vesting-positions { user: user, index: index }))
    )
    (ok {
      amount: (default-to u0 (get amount local-vesting-data)),
      start-at: (default-to u0 (get start-at local-vesting-data)),
      end-at: (default-to u0 (get end-at local-vesting-data)),
      last-claimed-at: (default-to u0 (get last-claimed-at local-vesting-data)),
      has-claimed: (default-to false (get has-claimed local-vesting-data)),
      claimable: (try! 
        (get-claimable-amount
          (default-to u0 (get amount local-vesting-data))
          (default-to u0 (get end-at local-vesting-data))
          (default-to u0 (get last-claimed-at local-vesting-data))
        )
      )
    })
  )
)

;; admin functions
;;
(define-public (transfer-ownership (new-owner principal))
  (begin
    (try! (check-is-owner))
    (var-set owner new-owner)
    (ok true)
  )
)

;; private functions
;;
(define-private (check-is-owner)
  (ok (asserts! (is-eq (var-get owner) tx-sender) ERR_FORBIDDEN))
)

(define-private (get-block-timestamp)
  (if (is-eq chain-id u1)
    (ok (unwrap! (get-block-info? time block-height) ERR_GET_BLOCK_INFO))
    (ok (var-get mock-timestamp))
  )
)

(define-private (get-claimable-amount (amount uint) (end-at uint) (last-claimed-at uint))
  (let
    (
      (block-timestamp (try! (get-block-timestamp)))
      (elapsed-duration 
        (if (< block-timestamp end-at)
          (- block-timestamp last-claimed-at)
          (- end-at last-claimed-at)
        )
      )
    )
    (ok (/ (* amount elapsed-duration) ONE_YEAR))
  )
)

;; mock functions
;;
(define-public (set-mock-timestamp (timestamp uint))
  (begin
    (try! (check-is-owner))
    (var-set mock-timestamp timestamp)
    (ok true)
  )
)

