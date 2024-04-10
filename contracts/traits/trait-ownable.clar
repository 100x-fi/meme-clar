;; title: trait-ownable
;; description: A trait defines functions of ownable contract

(define-trait ownable-trait
  (
    (get-owner () (response principal uint))
    (transfer-ownership (principal) (response bool uint))
  )
)