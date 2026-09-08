import unittest
from record_contract import parse_response, accepts

class RecordContractTest(unittest.TestCase):
    def setUp(self):
        self.checks = dict.fromkeys(['grade','typecheck','regression','lint'],0)
    def test_malformed_response_cannot_pass(self):
        for raw in ['broken', '{}', '[]', '{"is_error":true,"subtype":"success"}']:
            _, error = parse_response(raw)
            self.assertFalse(accepts(error,False,0,[],self.checks))
    def test_explicit_success_can_pass(self):
        _, error = parse_response('{"is_error":false,"subtype":"success"}')
        self.assertTrue(accepts(error,False,0,[],self.checks))
    def test_missing_check_cannot_pass(self):
        self.checks.pop('grade')
        self.assertFalse(accepts(None,False,0,[],self.checks))
    def test_timeout_cannot_pass(self):
        self.assertFalse(accepts(None,True,0,[],self.checks))
    def test_failed_check_and_scope_change_cannot_pass(self):
        self.checks['grade']=1
        self.assertFalse(accepts(None,False,0,[],self.checks))
        self.checks['grade']=0
        self.assertFalse(accepts(None,False,0,['src/types.ts'],self.checks))

if __name__ == '__main__': unittest.main()
