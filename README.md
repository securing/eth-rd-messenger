Ethereum Responsible Disclosure Messenger (by @drdr_zz).
========================================

Check it out right now: https://damianrusinek.github.io/eth-messenger-dapp/

This tool is used to:
* send a secret message to the owner of a personal or contract Ethereum address, encypted with its owner ECC public key,
* decrypt the message sent to the personal address or contract's owner.

### Motivation

When doing research in the field of Ethereum Smart Contract security I came across a problem in finding the owner of the vulnerable contracts. This is particularly important for publicly available smart contracts, where time plays a crucial role.

When you, as an ethical hacker, want to report the vulnerability you can either:
* exploit it illegally and start looking for the owner (we don't want to do that), or
* start looking for the owner and hope that noone exploits the vulnerability (we don't want to do that either).

I want to use this tool for Responsible Disclosure. I firstly leave the encrypted, unmodifiable and undeniable message (in the end it's blockchain) where to find the stolen Ether and then exploit the vulnerability.
