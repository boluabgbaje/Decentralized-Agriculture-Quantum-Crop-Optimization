;; Crop Enhancement Contract
;; Manages quantum crop improvement

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u200))
(define-constant err-not-authorized (err u201))
(define-constant err-invalid-enhancement (err u202))
(define-constant err-enhancement-exists (err u203))
(define-constant err-enhancement-not-found (err u204))

;; Data structures
(define-map crop-enhancements uint
  {
    producer: principal,
    crop-type: (string-ascii 50),
    enhancement-level: uint,
    quantum-frequency: uint,
    enhancement-date: uint,
    expected-yield-increase: uint,
    status: (string-ascii 20)
  })

(define-map producer-enhancements principal (list 100 uint))
(define-data-var enhancement-counter uint u0)

;; Read-only functions
(define-read-only (get-enhancement (enhancement-id uint))
  (map-get? crop-enhancements enhancement-id))

(define-read-only (get-producer-enhancements (producer principal))
  (default-to (list) (map-get? producer-enhancements producer)))

(define-read-only (get-total-enhancements)
  (var-get enhancement-counter))

;; Public functions
(define-public (create-enhancement
  (producer principal)
  (crop-type (string-ascii 50))
  (enhancement-level uint)
  (quantum-frequency uint)
  (expected-yield-increase uint))
  (let ((enhancement-id (+ (var-get enhancement-counter) u1)))
    (asserts! (and (>= enhancement-level u1) (<= enhancement-level u10)) err-invalid-enhancement)
    (asserts! (and (>= quantum-frequency u1) (<= quantum-frequency u1000)) err-invalid-enhancement)
    (asserts! (<= expected-yield-increase u200) err-invalid-enhancement)

    (map-set crop-enhancements enhancement-id
      {
        producer: producer,
        crop-type: crop-type,
        enhancement-level: enhancement-level,
        quantum-frequency: quantum-frequency,
        enhancement-date: block-height,
        expected-yield-increase: expected-yield-increase,
        status: "active"
      })

    (let ((current-enhancements (get-producer-enhancements producer)))
      (map-set producer-enhancements producer
        (unwrap-panic (as-max-len? (append current-enhancements enhancement-id) u100))))

    (var-set enhancement-counter enhancement-id)
    (ok enhancement-id)))

(define-public (update-enhancement-status (enhancement-id uint) (new-status (string-ascii 20)))
  (let ((enhancement (unwrap! (get-enhancement enhancement-id) err-enhancement-not-found)))
    (asserts! (or (is-eq tx-sender (get producer enhancement)) (is-eq tx-sender contract-owner)) err-not-authorized)

    (map-set crop-enhancements enhancement-id
      (merge enhancement { status: new-status }))
    (ok true)))

(define-public (calculate-enhancement-efficiency (enhancement-id uint) (actual-yield-increase uint))
  (let ((enhancement (unwrap! (get-enhancement enhancement-id) err-enhancement-not-found)))
    (let ((expected (get expected-yield-increase enhancement))
          (efficiency (if (> expected u0) (/ (* actual-yield-increase u100) expected) u0)))
      (ok efficiency))))
