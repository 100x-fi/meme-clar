;; title: trait-mintable-sip-010
;; description: A trait contains functions of mintable SIP-010 token

(define-trait mintable-sip-010-trait
  (
    ;; Mint
    (mint (principal uint) (response bool uint))
  )
)