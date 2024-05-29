# content-claims CLI

Simple CLI to the content-claims UCAN API.

## Install

```sh
npm i -g @web3-storage/content-claims-cli
```

## Usage

```sh
claim --help
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
claim location bagycar https://s3.url/bagycar.car -o location.claim
bafkpartition

# generate partition claim
claim partition bafyroot bagycar -o partition.claim
bafkpartition

cardex build my.car -o my.car.idx
bafkindex

# generate inclusion claim
claim inclusion bagycar bafkindex -o inclusion.claim
bafkinclusion

# generate relation claims
claim relation bafyroot --child bafyblock0 --child bafyblock1 --part bagycar -o relation.claim
bafkrelation

# Write claims to `claims.web3.storage`
claim write *.claim
```

### Write

Write claims to `claims.web3.storage`:

```sh
claim write *.claim
```

### Read

Read claims from `claims.web3.storage`:

```sh
claim read bagycar --walk=parts,includes
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/content-claims/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/content-claims/blob/main/LICENSE.md)
