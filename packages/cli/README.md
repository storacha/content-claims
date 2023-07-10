# content-claims CLI

Simple CLI to the content-claims UCAN API.

## Install

```sh
npm i -g @web3-storage/content-claims-cli
```

## Usage

```sh
ccs --help
```

### Generate

Generate claims for audience `did:web:claims.web3.storage`.

```sh
# build a DAG and pack into a CAR
ipfs-car pack my.file -o my.car
bafyroot

# get the CID of the CAR file
ipfs-car hash my.car
bagycar

# generate location claim
ccs location bagycar https://s3.url/bagycar.car -o location.claim
bafkpartition

# generate partition claim
ccs partition bafyroot bagycar -o partition.claim
bafkpartition

cardex build my.car -o my.car.idx
bafkindex

# generate inclusion claim
ccs inclusion bagycar bafkindex -o inclusion.claim
bafkinclusion

# generate relation claims
ccs relation bafyroot bafyblock0 bafyblock1 -o relation.claim
bafkrelation

# Write claims to `claims.web3.storage`
ccs write *.claim
```

### Write

Write claims to `claims.web3.storage`:

```sh
ccs write *.claim
```

### Read

Read claims from `claims.web3.storage`:

```sh
ccs read bagycar --walk=parts,includes
```
