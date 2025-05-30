;; Environmental Integration Contract
;; Optimizes quantum farming sustainability

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u300))
(define-constant err-invalid-data (err u301))
(define-constant err-location-not-found (err u302))

;; Data structures
(define-map environmental-data uint
  {
    location: (string-ascii 100),
    soil-ph: uint,
    moisture-level: uint,
    quantum-field-strength: uint,
    temperature: uint,
    sustainability-score: uint,
    measurement-date: uint
  })

(define-map location-history (string-ascii 100) (list 50 uint))
(define-data-var measurement-counter uint u0)

;; Read-only functions
(define-read-only (get-environmental-data (measurement-id uint))
  (map-get? environmental-data measurement-id))

(define-read-only (get-location-history (location (string-ascii 100)))
  (default-to (list) (map-get? location-history location)))

(define-read-only (calculate-sustainability-score
  (soil-ph uint)
  (moisture-level uint)
  (quantum-field-strength uint)
  (temperature uint))
  (let ((ph-score (if (and (>= soil-ph u60) (<= soil-ph u75)) u25 u10))
        (moisture-score (if (and (>= moisture-level u40) (<= moisture-level u80)) u25 u10))
        (quantum-score (if (>= quantum-field-strength u50) u25 u10))
        (temp-score (if (and (>= temperature u15) (<= temperature u30)) u25 u10)))
    (+ ph-score moisture-score quantum-score temp-score)))

;; Public functions
(define-public (record-environmental-data
  (location (string-ascii 100))
  (soil-ph uint)
  (moisture-level uint)
  (quantum-field-strength uint)
  (temperature uint))
  (let ((measurement-id (+ (var-get measurement-counter) u1))
        (sustainability-score (calculate-sustainability-score soil-ph moisture-level quantum-field-strength temperature)))

    (asserts! (and (<= soil-ph u140) (<= moisture-level u100) (<= quantum-field-strength u100) (<= temperature u50)) err-invalid-data)

    (map-set environmental-data measurement-id
      {
        location: location,
        soil-ph: soil-ph,
        moisture-level: moisture-level,
        quantum-field-strength: quantum-field-strength,
        temperature: temperature,
        sustainability-score: sustainability-score,
        measurement-date: block-height
      })

    (let ((current-history (get-location-history location)))
      (map-set location-history location
        (unwrap-panic (as-max-len? (append current-history measurement-id) u50))))

    (var-set measurement-counter measurement-id)
    (ok measurement-id)))

(define-public (get-optimal-conditions (location (string-ascii 100)))
  (let ((history (get-location-history location)))
    (if (> (len history) u0)
      (let ((latest-id (unwrap-panic (element-at history (- (len history) u1))))
            (latest-data (unwrap-panic (get-environmental-data latest-id))))
        (ok {
          recommended-ph: u65,
          recommended-moisture: u60,
          recommended-quantum-field: u75,
          recommended-temperature: u22,
          current-sustainability: (get sustainability-score latest-data)
        }))
      err-location-not-found)))
