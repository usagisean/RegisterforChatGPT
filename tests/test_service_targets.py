import os
import unittest
from unittest import mock

from core.service_targets import rewrite_loopback_url_for_container
from platforms.chatgpt.cpa_upload import upload_to_cpa
from services.cliproxyapi_sync import _base_url


class ServiceTargetTests(unittest.TestCase):
    def test_rewrite_loopback_url_when_running_in_container(self):
        with mock.patch.dict(os.environ, {"APP_CONDA_ENV": "docker"}, clear=False):
            self.assertEqual(
                rewrite_loopback_url_for_container("http://127.0.0.1:8318"),
                "http://host.docker.internal:8318",
            )

    def test_non_loopback_url_is_left_unchanged(self):
        with mock.patch.dict(os.environ, {"APP_CONDA_ENV": "docker"}, clear=False):
            self.assertEqual(
                rewrite_loopback_url_for_container("http://cliproxyapiplus:8317"),
                "http://cliproxyapiplus:8317",
            )

    def test_cliproxy_base_url_uses_container_host_alias(self):
        with mock.patch.dict(os.environ, {"APP_CONDA_ENV": "docker"}, clear=False):
            with mock.patch("services.cliproxyapi_sync._get_config_value", return_value="http://127.0.0.1:8318"):
                self.assertEqual(_base_url(), "http://host.docker.internal:8318")

    def test_upload_to_cpa_rewrites_loopback_url_inside_container(self):
        token_data = {"email": "demo@example.com", "access_token": "at", "refresh_token": "rt", "id_token": "it"}
        response = mock.Mock(status_code=201)
        response.json.return_value = {}

        with mock.patch.dict(os.environ, {"APP_CONDA_ENV": "docker"}, clear=False):
            with mock.patch("platforms.chatgpt.cpa_upload.cffi_requests.post", return_value=response) as post_mock:
                ok, msg = upload_to_cpa(token_data, api_url="http://127.0.0.1:8318", api_key="demo")

        self.assertTrue(ok)
        self.assertEqual(msg, "上传成功")
        self.assertEqual(
            post_mock.call_args.args[0],
            "http://host.docker.internal:8318/v0/management/auth-files",
        )


if __name__ == "__main__":
    unittest.main()
