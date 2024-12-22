use sn_workshop::Counter;
use starknet::ContractAddress;

use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address, spy_events, EventSpyAssertionsTrait,
};

use sn_workshop::{
    ICounterDispatcher, ICounterDispatcherTrait, ICounterSafeDispatcher,
    ICounterSafeDispatcherTrait,
};

use Counter::Errors::NEGATIVE_COUNTER;

fn OWNER() -> ContractAddress {
    'OWNER'.try_into().unwrap()
}

fn deploy_counter(initial_count: u32) -> (ICounterDispatcher, ICounterSafeDispatcher) {
    let contract = declare("Counter").unwrap().contract_class();
    let mut calldata = array![];
    initial_count.serialize(ref calldata);
    OWNER().serialize(ref calldata);

    let (contract_address, _) = contract.deploy(@calldata).unwrap();

    let dispatcher = ICounterDispatcher { contract_address };
    let safe_dispatcher = ICounterSafeDispatcher { contract_address };

    (dispatcher, safe_dispatcher)
}

#[test]
fn test_deploy_contract() {
    let initial_count = 0;
    let (counter, _) = deploy_counter(initial_count);

    let current_counter = counter.get_counter();
    assert!(current_counter == initial_count, "count should be initial count")
}

#[test]
fn test_increase_counter() {
    let initial_count = 0;
    let (counter, _) = deploy_counter(initial_count);
    let mut spy = spy_events();

    counter.increase_counter();

    let expected_count = initial_count + 1;
    let current_count = counter.get_counter();
    spy
        .assert_emitted(
            @array![
                (
                    counter.contract_address,
                    Counter::Event::CounterIncreased(
                        Counter::CounterIncreased { counter: current_count },
                    ),
                ),
            ],
        );

    assert!(current_count == expected_count, "Counter should increment")
}

#[test]
fn test_decrease_counter() {
    let initial_count = 1;
    let (counter, _) = deploy_counter(initial_count);
    let mut spy = spy_events();

    counter.decrease_counter();

    let expected_count = initial_count - 1;
    let current_count = counter.get_counter();

    spy
        .assert_emitted(
            @array![
                (
                    counter.contract_address,
                    Counter::Event::CounterDecreased(
                        Counter::CounterDecreased { counter: current_count },
                    ),
                ),
            ],
        );
    assert!(current_count == expected_count, "Counter should decrement")
}

#[test]
#[feature("safe_dispatcher")]
fn test_decrease_counter_underflow() {
    let initial_count = 0;
    let (_, safe_counter) = deploy_counter(initial_count);

    match safe_counter.decrease_counter() {
        Result::Ok(_) => panic!("Decrease below 0 did not panic"),
        Result::Err(panic_data) => {
            assert!(*panic_data[0] == NEGATIVE_COUNTER, "Should throw NEGATIVE COUNTER error")
        },
    }
}

#[test]
#[should_panic]
fn test_increase_counter_overflow() {
    let initial_count = 0xFFFFFFFF;
    let (counter, _) = deploy_counter(initial_count);
    counter.increase_counter();
}

#[test]
#[feature("safe_dispatcher")]
fn test_reset_counter_non() {
    let initial_count = 5;
    let (counter, safe_counter) = deploy_counter(initial_count);

    match safe_counter.reset_counter() {
        Result::Ok(_) => panic!("only owner can reset the counter"),
        Result::Err(panic_data) => {
            assert!(
                *panic_data[0] == 'Caller is not the owner',
                "Should error if caller is not the owner",
            )
        },
    }

    let current_count = counter.get_counter();

    assert!(current_count == initial_count, "Counter should not have reset")
}

#[test]
fn test_reset_counter_as_owner() {
    let initial_count = 5;
    let (counter, _) = deploy_counter(initial_count);

    counter.increase_counter();

    start_cheat_caller_address(counter.contract_address, OWNER());
    counter.reset_counter();
    stop_cheat_caller_address(counter.contract_address);

    let current_counter = counter.get_counter();

    assert!(current_counter == 0, "Counter should be reset to 0")
}
