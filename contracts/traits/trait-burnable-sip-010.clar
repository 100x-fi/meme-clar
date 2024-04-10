;; title: trait-burnable-sip-010
;; description: A trait contains functions of burnable SIP-010 token

(define-trait burnable-sip-010-trait
  (
    ;; Burn
    (burn (principal uint) (response bool uint))
  )
)